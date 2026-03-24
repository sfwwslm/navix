/**
 * @file src/services/apiClient.ts
 * @description 封装了一个健壮的、支持超时的 fetch API 客户端。
 * 这个客户端旨在统一应用中所有的 HTTP 请求，提供了以下核心功能：
 * 1.  **动态 Base URL**：在每次请求时，从当前活动会话读取服务器地址。
 * 2.  **自动认证**：自动从当前活动会话读取并注入 Bearer Token。
 * 3.  **请求超时处理**：使用 `AbortController` 实现可靠的请求超时。
 * 4.  **精细的错误处理**：将不同类型的错误封装成自定义错误类，便于上层捕获和处理。
 * 5.  **响应体自动解析**：根据响应头的 'Content-Type' 自动解析 JSON。
 * 6.  **便捷的 HTTP 方法**：提供了 `get`, `post`, `put`, `delete` 等快捷方法。
 * 7.  **鉴权恢复**：命中 401 时会尝试走统一 refresh 流程，并仅自动重试一次。
 */

import { fetch } from "@tauri-apps/plugin-http";
import {
  APP_ERROR_CODES,
  appExceptionFromResponse,
  createAppException,
  createFrontendTelemetryLogger,
  isAppException,
} from "@navix/shared-ts";
import { ANONYMOUS_USER_UUID } from "./user";
import { getActiveSessionUser, refreshActiveSession } from "./authSession";
import { log, toErrorMessage } from "@/utils/logger";

const telemetry = createFrontendTelemetryLogger({
  app: "desktop",
  appVersion:
    (import.meta as { env?: { VITE_APP_VERSION?: string } }).env
      ?.VITE_APP_VERSION ?? "unknown",
});

// --- 类型定义 ---

/**
 * @interface RequestOptions
 * @description 定义了 apiClient 函数的配置选项。
 */
interface RequestOptions extends Omit<RequestInit, "body"> {
  /**
   * 请求的超时时间（毫秒）。
   * @default 8000
   */
  timeout?: number;
  /**
   * 请求体，可以是任何可以被序列化为 JSON 的对象。
   */
  body?: unknown;
  /**
   * 可选的基础 URL (协议 + 主机名 + 端口)。
   * 如果提供，则请求将发往此地址；否则，将使用当前登录用户的 `serverAddress` 作为默认值。
   * @example "https://api.github.com"
   */
  baseUrl?: string;

  [key: string]: unknown;
}

/**
 * 一个健壮的 fetch 封装，它在每次调用时动态读取认证信息。
 * @template T - 期望的响应数据类型。
 * @param {string} endpoint - API 的端点路径 (e.g., '/api/v1/profile')。
 * @param {RequestOptions} [options={}] - fetch 请求的配置选项。
 * @param {boolean} [isRetry=false] - 是否为 refresh 后的重试请求；用于避免无限重试。
 * @returns {Promise<T>} - 解析后的响应数据。
 * @throws {AppException} 抛出统一共享异常模型。
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  // 在请求发起前，从 localStorage 动态获取当前用户信息
  const activeUser = getActiveSessionUser();

  if (
    activeUser?.uuid !== ANONYMOUS_USER_UUID &&
    (!activeUser?.serverAddress || !activeUser?.token)
  ) {
    throw createAppException({
      source: "app",
      code: APP_ERROR_CODES.AuthTokenInvalid,
      message: "无法发起请求：用户未登录或认证信息不完整。",
      httpStatus: 401,
    });
  }

  // 1. 设置超时逻辑
  const { timeout = 8000, baseUrl, ...restOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // 2. 准备请求头
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Authorization") && activeUser?.token) {
    headers.set("Authorization", `Bearer ${activeUser.token}`);
  }
  const tracedHeaders = telemetry.withTraceHeaders(headers);

  // 3. 准备请求体
  const body = options.body ? JSON.stringify(options.body) : undefined;

  // 4. 构建完整的请求 URL
  const serverAddress = baseUrl || activeUser.serverAddress;
  const requestUrl = `${serverAddress}${endpoint}`;

  try {
    // 5. 发起 fetch 请求
    const response = await fetch(requestUrl, {
      ...restOptions,
      headers: tracedHeaders,
      body,
      signal: controller.signal,
      danger: { acceptInvalidCerts: true, acceptInvalidHostnames: true },
    });
    telemetry.captureResponseContext(response.headers);

    clearTimeout(timeoutId);

    // 6. 检查 HTTP 响应状态
    if (!response.ok) {
      // 如果是 401 错误且不是重试请求，尝试刷新令牌
      if (
        response.status === 401 &&
        !isRetry &&
        activeUser?.refreshToken &&
        activeUser?.uuid !== ANONYMOUS_USER_UUID
      ) {
        log.info("检测到 401 错误，尝试刷新令牌...");
        try {
          await refreshActiveSession(activeUser.uuid);
          // 重新发起请求
          return await apiClient(endpoint, options, true);
        } catch (refreshError) {
          log.error(`令牌刷新失败: ${toErrorMessage(refreshError)}`);
          // 刷新失败，继续执行后面的错误抛出逻辑
        }
      }

      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }
      throw appExceptionFromResponse(errorBody, "server", {
        code: APP_ERROR_CODES.InternalServerError,
        message: `服务器响应错误: ${response.statusText}`,
        httpStatus: response.status,
      });
    }

    // 7. 解析成功的响应体
    const contentType = response.headers.get("content-type");
    if (response.status === 204 || !contentType) {
      // 204 No Content
      return null as T;
    }
    if (contentType?.includes("application/json")) {
      return (await response.json()) as T;
    }
    return (await response.text()) as unknown as T;
  } catch (error) {
    clearTimeout(timeoutId);

    // 8. 错误分类与处理
    if (isAppException(error)) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw createAppException({
        source: "timeout",
        code: APP_ERROR_CODES.RequestTimeout,
        message: `请求 '${endpoint}' 已超时 (${timeout}ms)`,
        httpStatus: 408,
        cause: error,
      });
    }
    if (error instanceof TypeError) {
      throw createAppException({
        source: "network",
        code: APP_ERROR_CODES.NetworkRequestFailed,
        message: `网络请求失败: ${error.message}`,
        cause: error,
      });
    }
    log.error(`请求 '${endpoint}' 发生错误: ${toErrorMessage(error)}`);
    // 匹配括号及其中内容，并删除首尾空格
    const result = toErrorMessage(error)
      .replace(/\([^)]*\)/g, "")
      .trim();
    throw createAppException({
      source: "app",
      code: APP_ERROR_CODES.ClientUnexpectedError,
      message: error instanceof Error ? error.message : result,
      cause: error,
    });
  }
}

/**
 * apiClient 的便捷方法集合，简化常用 HTTP 请求的调用。
 */
export const apiClientWrapper = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: "POST", body }),

  put: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: "PUT", body }),

  delete: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: "DELETE", body }),
};
