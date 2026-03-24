import { APP_ERROR_CODES } from "@navix/shared-ts";
import type { ApiResponse } from "@navix/shared-ts";
import {
  AppException,
  appExceptionFromResponse,
  createAppException,
  createFrontendTelemetryLogger,
  isAuthAppError,
} from "@navix/shared-ts";

const telemetry = createFrontendTelemetryLogger({
  app: "web",
  appVersion:
    (import.meta as { env?: { VITE_APP_VERSION?: string } }).env
      ?.VITE_APP_VERSION ?? "unknown",
});

export { AppException as ApiRequestError };

function isApiEnvelope<T = unknown>(value: unknown): value is ApiResponse<T> {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.success === "boolean" &&
    typeof record.code === "string" &&
    typeof record.http_status === "number" &&
    typeof record.message === "string"
  );
}

function extractErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.length > 0) {
    return record.message;
  }
  if (typeof record.error === "string" && record.error.length > 0) {
    return record.error;
  }
  return "";
}

/**
 * 统一调用返回 ApiResponse 信封的后端接口。
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const headers = telemetry.withTraceHeaders(options?.headers);
  const response = await fetch(url, { ...options, headers });
  telemetry.captureResponseContext(response.headers);
  const contentType = response.headers.get("content-type") || "";
  const payload: unknown = contentType.includes("application/json")
    ? ((await response.json()) as unknown)
    : null;

  if (!isApiEnvelope<T>(payload)) {
    throw createAppException({
      source: response.ok ? "http" : "server",
      code: APP_ERROR_CODES.RequestBadRequest,
      message: extractErrorMessage(payload) || "响应格式不符合约定",
      httpStatus: response.status,
      cause: payload,
    });
  }

  if (!response.ok || !payload.success) {
    throw appExceptionFromResponse(payload, "server", {
      code: APP_ERROR_CODES.RequestBadRequest,
      message: payload.message || "请求失败",
      httpStatus: payload.http_status || response.status,
    });
  }

  return payload;
}

/**
 * 调用返回非 ApiResponse 信封的接口（如 /api/login）。
 */
export async function apiFetchRaw<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const headers = telemetry.withTraceHeaders(options?.headers);
  const response = await fetch(url, { ...options, headers });
  telemetry.captureResponseContext(response.headers);
  const contentType = response.headers.get("content-type") || "";
  const payload: unknown = contentType.includes("application/json")
    ? ((await response.json()) as unknown)
    : null;

  if (!response.ok) {
    throw appExceptionFromResponse(payload, "server", {
      code: APP_ERROR_CODES.RequestBadRequest,
      message: extractErrorMessage(payload) || "请求失败",
      httpStatus: response.status,
    });
  }

  return payload as T;
}

export function isAuthError(err: unknown): err is AppException {
  if (isAuthAppError(err)) return true;
  return (
    err instanceof AppException &&
    (err.httpStatus === 400 || err.httpStatus === 401 || err.httpStatus === 403)
  );
}
