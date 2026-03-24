import { useCallback, ReactNode, useEffect, useState } from "react";
import { log } from "@/utils/logger";

import useLocalStorage from "@/hooks/useLocalStorage";
import { saveUserRecord as saveUser } from "@/services/database/commands/user";
import { AppException } from "@navix/shared-ts";
import {
  User,
  ANONYMOUS_USER_UUID,
  ANONYMOUS_USER,
  setUserLoginStatus,
  getAllUsers,
  updateUserServerAddress,
  deleteUserWithData,
} from "@/services/user";
import {
  ensureActiveUser,
  setActiveSessionUser,
  subscribeActiveUser,
} from "@/services/authSession";
import { apiClientWrapper } from "@/services/apiClient";
import type { LoginResponse } from "@/types/session";
import { AuthContext, Claims } from "./Auth.context";

/**
 * 解析 JWT payload 并返回标准化 `Claims`。
 * 解析失败时返回 `null`，由调用方决定后续处理策略。
 */
function parseJwt(token: string): Claims | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );
    const parsed: unknown = JSON.parse(jsonPayload);
    if (
      parsed &&
      typeof parsed === "object" &&
      "sub" in parsed &&
      "username" in parsed &&
      "iss" in parsed
    ) {
      return parsed as Claims;
    }
    return null;
  } catch (error) {
    log.error(`JWT 解析失败: ${String(error)}`);
    return null;
  }
}

function createErrorWithCause(message: string, cause: unknown): Error {
  const error = new Error(message) as Error & { cause?: unknown };
  error.cause = cause;
  return error;
}

/**
 * 桌面端认证上下文提供者。
 * 负责用户登录、切换、登出和本地用户列表维护，并订阅统一会话状态变化。
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [activeUser, setActiveUser] = useLocalStorage<User | null>(
    "activeUser",
    ensureActiveUser(),
  );
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  // 用于全局锁定数据库操作
  const [isDataOperationInProgress, setDataOperationInProgress] =
    useState(false);
  // 用于在数据变更后触发UI刷新
  const [dataVersion, setDataVersion] = useState(0);

  /**
   * @function incrementDataVersion
   * @description 递增数据版本号，通知组件刷新
   */
  const incrementDataVersion = useCallback(() => {
    setDataVersion((v) => v + 1);
    log.info("数据版本号已更新，将触发相关组件的数据刷新");
  }, []);

  const refreshAvailableUsers = useCallback(async () => {
    const users = await getAllUsers();
    setAvailableUsers(users);
    return users;
  }, []);

  useEffect(() => {
    void refreshAvailableUsers();
  }, [refreshAvailableUsers]);

  /**
   * 订阅统一会话状态变化，确保 refresh 后 React 内存态与持久化状态同步更新。
   */
  useEffect(() => {
    return subscribeActiveUser((nextUser) => {
      const resolvedUser = nextUser || {
        uuid: ANONYMOUS_USER_UUID,
        username: ANONYMOUS_USER,
        isLoggedIn: 1,
      };
      setActiveUser(resolvedUser);
      setAvailableUsers((prev) =>
        prev.map((user) =>
          user.uuid === resolvedUser.uuid ? { ...user, ...resolvedUser } : user,
        ),
      );
    });
  }, [setActiveUser]);

  /** 切换用户 */
  const switchActiveUser = useCallback((user: User) => {
    setActiveSessionUser(user);
    log.info(`已切换当前用户为: ${user.username}`);
  }, []);

  /**
   * 执行登录并建立新的本地活动会话。
   * 登录成功后会同时落库、刷新用户列表并切换当前 active user。
   */
  const login = useCallback(
    async (
      username: string,
      password: string,
      address: string,
      useHttps: boolean,
    ) => {
      try {
        const protocol = useHttps ? "https" : "http";
        const serverAddress = `${protocol}://${address}`;
        const res: LoginResponse = await apiClientWrapper.post(
          "/api/login",
          {
            username,
            password,
          },
          {
            baseUrl: serverAddress,
          },
        );

        const claims = parseJwt(res.access_token);
        if (!claims) throw new Error("无法解析Token");

        const newUser: User = {
          uuid: claims.sub,
          username: claims.username,
          serverAddress: useHttps ? `https://${address}` : `http://${address}`,
          serverInstanceUuid: claims.iss,
          isLoggedIn: 1, // 标记为已登录
          token: res.access_token,
          refreshToken: res.refresh_token,
        };

        await saveUser(newUser);
        await setUserLoginStatus(newUser.uuid, true);

        // 顺序不能反：先刷新列表，再切换 activeUser，避免依赖列表的 UI 读到旧数据。
        // 登录成功后，立即将新用户设置为活动用户
        await refreshAvailableUsers();
        switchActiveUser(newUser);

        log.info(`登录成功，用户: ${newUser.username}`);
      } catch (error: unknown) {
        log.error(`登录失败，错误信息: ${String(error)}`);
        if (error instanceof AppException) {
          const message = error.message || "登录失败";
          throw createErrorWithCause(message, error);
        }
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    [switchActiveUser, refreshAvailableUsers],
  );

  const logoutUser = useCallback(
    // 退出账户逻辑
    async (uuid: string) => {
      await setUserLoginStatus(uuid, false);
      const refreshedUsers = await refreshAvailableUsers();
      if (activeUser?.uuid === uuid) {
        const anonymousUser = refreshedUsers.find(
          (u) => u.uuid === ANONYMOUS_USER_UUID,
        );
        if (anonymousUser) {
          switchActiveUser(anonymousUser);
        }
      }
      log.info(`用户 ${uuid} 已被登出。`);
    },
    [activeUser, refreshAvailableUsers, switchActiveUser],
  );

  const logout = useCallback(async () => {
    if (activeUser && activeUser.isLoggedIn) {
      await logoutUser(activeUser.uuid);
    }
  }, [activeUser, logoutUser]);

  const deleteUser = useCallback(
    async (uuid: string) => {
      await deleteUserWithData(uuid);
      const refreshedUsers = await refreshAvailableUsers();

      if (activeUser?.uuid === uuid) {
        const anonymousUser = refreshedUsers.find(
          (u) => u.uuid === ANONYMOUS_USER_UUID,
        ) || {
          uuid: ANONYMOUS_USER_UUID,
          username: ANONYMOUS_USER,
          isLoggedIn: 1,
        };
        switchActiveUser(anonymousUser);
      }

      incrementDataVersion();
      log.info(`用户 ${uuid} 及其本地数据已被删除。`);
    },
    [activeUser, incrementDataVersion, refreshAvailableUsers, switchActiveUser],
  );

  /**
   * 更新当前活动用户绑定的服务器地址，并同步写回统一会话状态。
   */
  const updateServerAddress = useCallback(
    async (serverAddress: string) => {
      if (!activeUser) {
        return;
      }
      const trimmedAddress = serverAddress.trim();
      await updateUserServerAddress(activeUser.uuid, trimmedAddress);
      const updatedUser = { ...activeUser, serverAddress: trimmedAddress };
      setActiveSessionUser(updatedUser);
      setAvailableUsers((prev) =>
        prev.map((user) =>
          user.uuid === activeUser.uuid
            ? { ...user, serverAddress: trimmedAddress }
            : user,
        ),
      );
      log.info(
        `用户 ${activeUser.username} (${activeUser.uuid}) 的服务器地址已更新。`,
      );
    },
    [activeUser, setAvailableUsers],
  );

  return (
    <AuthContext.Provider
      value={{
        activeUser,
        availableUsers,
        isLoggedIn: !!activeUser && activeUser.isLoggedIn === 1,
        login,
        logout,
        logoutUser,
        switchActiveUser,
        deleteUser,
        isDataOperationInProgress,
        dataVersion,
        setDataOperationInProgress,
        incrementDataVersion,
        refreshAvailableUsers,
        updateServerAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
