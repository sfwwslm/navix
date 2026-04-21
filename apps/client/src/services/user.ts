import { join } from "@tauri-apps/api/path";
import { readDir, remove } from "@tauri-apps/plugin-fs";
import { log, toErrorMessage } from "@/utils/logger";
import { getIconsDir } from "@/utils/fs";
import {
  deleteUserWithDataRecord,
  getAllUsersRecord,
  getUsedIconNamesRecord,
  setUserLoginStatusRecord,
  updateUserServerAddressRecord,
  updateUsernameRecord,
} from "./database/commands/user";

/** 用户表的数据结构 */
export interface User {
  uuid: string;
  username: string;
  isLoggedIn: number;
  serverAddress?: string;
  serverInstanceUuid?: string;
  token?: string;
  refreshToken?: string;
}

export const ANONYMOUS_USER_UUID = "00000000-0000-0000-0000-000000000000";
export const ANONYMOUS_USER = "anonymous";

export async function updateUsername(
  uuid: string,
  newUsername: string,
): Promise<void> {
  await updateUsernameRecord(uuid, newUsername);
  log.info(`用户 ${uuid} 的用户名已更新为 ${newUsername}`);
}

export async function setUserLoginStatus(
  uuid: string,
  isLoggedIn: boolean,
): Promise<void> {
  await setUserLoginStatusRecord(uuid, isLoggedIn);
}

export async function updateUserServerAddress(
  uuid: string,
  serverAddress: string,
): Promise<void> {
  await updateUserServerAddressRecord(uuid, serverAddress);
  log.info(`用户 ${uuid} 的服务器地址已更新为 ${serverAddress}`);
}

export const getAllUsers = async (): Promise<User[]> => {
  try {
    return await getAllUsersRecord();
  } catch (error) {
    log.error(`获取可切换用户列表失败: ${toErrorMessage(error)}`);
    return [];
  }
};

export const getActiveUserFromStorage = (): User | null => {
  try {
    const item = window.localStorage.getItem("activeUser");
    if (!item) {
      return null;
    }

    const parsedUser: unknown = JSON.parse(item);
    if (
      parsedUser &&
      typeof parsedUser === "object" &&
      "uuid" in parsedUser &&
      typeof parsedUser.uuid === "string" &&
      "username" in parsedUser &&
      typeof parsedUser.username === "string" &&
      "isLoggedIn" in parsedUser &&
      typeof parsedUser.isLoggedIn === "number"
    ) {
      return parsedUser as User;
    }

    return null;
  } catch (error) {
    log.error(
      `从 localStorage 读取或解析 activeUser 失败: ${toErrorMessage(error)}`,
    );
    return null;
  }
};

export async function cleanupUnusedIcons(): Promise<number> {
  try {
    const usedIconNames = new Set(await getUsedIconNamesRecord());

    const iconsDir = await getIconsDir();
    let entries: Awaited<ReturnType<typeof readDir>>;
    try {
      entries = await readDir(iconsDir);
    } catch (error) {
      log.warn(`读取图标目录失败，跳过图标清理: ${toErrorMessage(error)}`);
      return 0;
    }

    let removed = 0;
    for (const entry of entries) {
      if (!entry.name || entry.isDirectory) continue;
      if (!usedIconNames.has(entry.name)) {
        const fullPath = await join(iconsDir, entry.name);
        try {
          await remove(fullPath);
          removed += 1;
        } catch (error) {
          log.error(
            `删除未引用图标失败: ${fullPath} | ${toErrorMessage(error)}`,
          );
        }
      }
    }

    if (removed === 0) {
      log.debug("没有需要清理的本地图标文件。");
    }
    return removed;
  } catch (error) {
    log.error(`清理未使用图标时出错: ${toErrorMessage(error)}`);
    return 0;
  }
}

export async function deleteUserWithData(userUuid: string): Promise<void> {
  if (userUuid === ANONYMOUS_USER_UUID) {
    throw new Error("匿名用户用于离线数据，无法删除。");
  }

  try {
    await deleteUserWithDataRecord(userUuid);
    log.info(`已删除用户 ${userUuid} 及其关联数据。`);
  } catch (error) {
    log.error(`删除用户 ${userUuid} 失败: ${toErrorMessage(error)}`);
    throw error instanceof Error ? error : new Error(String(error));
  }

  const removedIcons = await cleanupUnusedIcons();
  if (removedIcons > 0) {
    log.info(`已清理 ${removedIcons} 个未引用的本地图标文件。`);
  }
}
