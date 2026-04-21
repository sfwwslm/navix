import { BaseDirectory, exists, mkdir } from "@tauri-apps/plugin-fs";
import { homeDir, join } from "@tauri-apps/api/path";
import { log } from "./logger";
import { HOME_VUST_DIR, APP_CONFIG_DIR } from "@/constants";

/**
 * 获取应用配置目录的路径 (~/.vust/navix)
 */
export async function getAppConfigDir() {
  return await join(await homeDir(), HOME_VUST_DIR, APP_CONFIG_DIR);
}

/**
 * 获取应用图标目录的路径
 */
export async function getIconsDir() {
  return await join(await getAppConfigDir(), "icons");
}

/**
 * @function ensureAppRootDirExists
 * @description 确保应用在用户主目录下的根文件夹 (.vust) 已创建。
 * 这个函数是幂等的：如果文件夹已存在，它不会执行任何操作；如果不存在，则会递归创建。
 * 这是应用启动时应首先调用的初始化函数之一，以保证后续操作（如数据库、日志、配置文件的读写）有正确的目录基础。
 */
export async function ensureAppRootDirExists(): Promise<void> {
  const dir = await getAppConfigDir();
  if (!(await exists(dir, { baseDir: BaseDirectory.Home }))) {
    log.info(`应用根目录不存在，正在创建: ${dir}`);
    await mkdir(dir, {
      baseDir: BaseDirectory.Home,
      recursive: true,
    });
  }
}
