import { fetch } from "@tauri-apps/plugin-http";
import {
  APP_ERROR_CODES,
  appExceptionFromResponse,
  createAppException,
  isAppException,
} from "@navix/shared-ts";
import { saveUserRecord as saveUser } from "./database/commands/user";
import {
  ANONYMOUS_USER,
  ANONYMOUS_USER_UUID,
  type User,
  getActiveUserFromStorage,
} from "./user";

type ActiveUserListener = (user: User | null) => void;

type AuthenticatedUser = User & {
  serverAddress: string;
  token: string;
  username: string;
};

type RefreshableUser = AuthenticatedUser & {
  refreshToken: string;
};

const listeners = new Set<ActiveUserListener>();

let refreshInFlight: Promise<RefreshableUser> | null = null;

interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

/**
 * 向所有订阅者广播当前活动用户变化。
 * 用于把 refresh、切换账号、登出后的最新会话同步到运行时状态。
 */
function emitActiveUser(user: User | null) {
  for (const listener of listeners) {
    listener(user);
  }
}

/**
 * 构造匿名用户占位对象。
 * 当本地没有可用会话时，桌面端仍使用匿名用户维持最小可运行状态。
 */
function toAnonymousUser(): User {
  return {
    uuid: ANONYMOUS_USER_UUID,
    username: ANONYMOUS_USER,
    isLoggedIn: 1,
  };
}

/**
 * 读取当前活动会话用户。
 * 当前实现以 `localStorage.activeUser` 作为桌面端运行时会话的权威来源。
 */
export function getActiveSessionUser(): User | null {
  return getActiveUserFromStorage();
}

/**
 * 订阅活动会话变化。
 * 典型调用方是 `AuthContext`，用于保持 React 内存态与持久化状态一致。
 */
export function subscribeActiveUser(listener: ActiveUserListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 更新当前活动会话并广播变化。
 * 所有主动写会话状态的地方都应经过这里，避免直接散落写 `localStorage`。
 */
export function setActiveSessionUser(user: User | null): void {
  if (user) {
    window.localStorage.setItem("activeUser", JSON.stringify(user));
    emitActiveUser(user);
    return;
  }

  window.localStorage.removeItem("activeUser");
  emitActiveUser(null);
}

/**
 * 断言当前存在可用于鉴权的活动用户。
 * 如果传入 `expectedUserUuid`，还会校验请求发起期间用户没有被切换。
 */
function requireAuthenticatedUser(
  expectedUserUuid?: string,
): AuthenticatedUser {
  const activeUser = getActiveSessionUser();

  if (
    !activeUser ||
    activeUser.uuid === ANONYMOUS_USER_UUID ||
    !activeUser.serverAddress ||
    !activeUser.token
  ) {
    throw createAppException({
      source: "app",
      code: APP_ERROR_CODES.AuthTokenInvalid,
      message: "当前用户未登录或认证信息不完整。",
      httpStatus: 401,
    });
  }

  if (expectedUserUuid && activeUser.uuid !== expectedUserUuid) {
    throw createAppException({
      source: "app",
      code: APP_ERROR_CODES.AuthTokenInvalid,
      message: "当前活动用户已切换，无法继续使用旧会话。",
      httpStatus: 401,
      details: {
        expectedUserUuid,
        actualUserUuid: activeUser.uuid,
      },
    });
  }

  return activeUser as AuthenticatedUser;
}

/**
 * 断言当前活动用户具备 refresh token，允许参与会话刷新。
 */
function requireRefreshableUser(expectedUserUuid?: string): RefreshableUser {
  const activeUser = requireAuthenticatedUser(expectedUserUuid);

  if (!activeUser.refreshToken) {
    throw createAppException({
      source: "app",
      code: APP_ERROR_CODES.AuthTokenInvalid,
      message: "当前会话缺少 refresh token，请重新登录。",
      httpStatus: 401,
    });
  }

  return activeUser as RefreshableUser;
}

/**
 * 判断一个失败是否值得在 refresh 后自动重试一次。
 * 当前仅对 token 失效类错误开放自动恢复，避免吞掉业务错误。
 */
function shouldRetryWithRefresh(error: unknown): boolean {
  return (
    isAppException(error) &&
    (error.code === APP_ERROR_CODES.AuthTokenExpired ||
      error.code === APP_ERROR_CODES.AuthTokenInvalid)
  );
}

/**
 * 直接执行 refresh 请求并写回最新会话。
 * 服务端采用 refresh token 旋转策略，因此刷新成功后必须同步更新 access/refresh token。
 */
async function performTokenRefresh(
  activeUser: RefreshableUser,
): Promise<RefreshableUser> {
  const response = await fetch(`${activeUser.serverAddress}/api/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: activeUser.refreshToken }),
    danger: { acceptInvalidCerts: true, acceptInvalidHostnames: true },
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }
    throw appExceptionFromResponse(errorBody, "server", {
      code: APP_ERROR_CODES.AuthTokenExpired,
      message: "会话刷新失败，请重新登录。",
      httpStatus: response.status,
    });
  }

  const data = (await response.json()) as RefreshTokenResponse;
  const refreshedUser: RefreshableUser = {
    ...activeUser,
    token: data.access_token,
    refreshToken: data.refresh_token,
  };

  await saveUser(refreshedUser);
  setActiveSessionUser(refreshedUser);
  return refreshedUser;
}

/**
 * 刷新当前活动会话。
 * 内部使用 single-flight，确保并发 401 时只会有一个真实 refresh 请求发出。
 */
export async function refreshActiveSession(
  expectedUserUuid?: string,
): Promise<RefreshableUser> {
  if (!refreshInFlight) {
    const currentUser = requireRefreshableUser(expectedUserUuid);
    refreshInFlight = performTokenRefresh(currentUser);
  }

  try {
    const refreshed = await refreshInFlight;
    if (expectedUserUuid && refreshed.uuid !== expectedUserUuid) {
      throw createAppException({
        source: "app",
        code: APP_ERROR_CODES.AuthTokenInvalid,
        message: "刷新后检测到活动用户已切换。",
        httpStatus: 401,
        details: {
          expectedUserUuid,
          actualUserUuid: refreshed.uuid,
        },
      });
    }
    return refreshed;
  } finally {
    refreshInFlight = null;
  }
}

/**
 * 以当前活动会话执行一个需要 JWT 的异步操作。
 * 若首次执行命中 token 失效，会先刷新会话，再自动重试一次。
 */
export async function runWithActiveSessionRetry<T>(
  executor: (activeUser: AuthenticatedUser) => Promise<T>,
  options: {
    expectedUserUuid?: string;
  } = {},
): Promise<T> {
  const activeUser = requireAuthenticatedUser(options.expectedUserUuid);

  try {
    return await executor(activeUser);
  } catch (error) {
    if (!shouldRetryWithRefresh(error) || !activeUser.refreshToken) {
      throw error;
    }

    await refreshActiveSession(options.expectedUserUuid);
    return executor(requireAuthenticatedUser(options.expectedUserUuid));
  }
}

/**
 * 返回当前活动用户；若不存在则回退为匿名用户对象。
 * 适用于 React 初始状态读取，避免组件层重复构造匿名用户。
 */
export function ensureActiveUser(): User {
  return getActiveSessionUser() ?? toAnonymousUser();
}
