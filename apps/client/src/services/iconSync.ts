import { join } from "@tauri-apps/api/path";
import { log } from "@/utils/logger";
import { getIconsDir } from "@/utils/fs";
import { callTauri } from "./tauri";
import { runWithActiveSessionRetry } from "./authSession";

/**
 * 将指定的图标文件上传到服务器。
 * @param iconsToUpload - 需要上传的图标文件名数组。
 * @returns {Promise<void>}
 * @description 此函数会遍历文件名列表，并为每个文件调用后端的 `upload_icon` Tauri 命令。
 * 上传前会复用统一会话状态；若命中 token 失效，会先 refresh 再重试当前文件。
 */
export async function uploadIcons(iconsToUpload: string[]): Promise<void> {
  const iconsDir = await getIconsDir();

  for (const filename of iconsToUpload) {
    try {
      const filePath = await join(iconsDir, filename);
      await runWithActiveSessionRetry((activeUser) =>
        callTauri("upload_icon", {
          user: activeUser,
          filePath: filePath,
          fileName: filename,
        }),
      );
      log.info(`✅ 图标上传任务已发送到后端: ${filename}`);
    } catch (error) {
      log.error(`❌ 调用图标上传命令失败: ${filename}。错误: ${String(error)}`);
    }
  }
}

/**
 * 从服务器下载指定的图标文件。
 * @param iconsToDownload - 需要下载的图标文件名数组。
 * @returns {Promise<void>}
 * @description 此函数会遍历文件名列表，并为每个文件调用后端的 `download_icon` Tauri 命令。
 * 下载前会复用统一会话状态；若命中 token 失效，会先 refresh 再重试当前文件。
 */
export async function downloadIcons(iconsToDownload: string[]): Promise<void> {
  for (const filename of iconsToDownload) {
    try {
      await runWithActiveSessionRetry((activeUser) =>
        callTauri("download_icon", {
          user: activeUser,
          fileName: filename,
        }),
      );
      log.info(`✅ 图标下载任务已发送到后端: ${filename}`);
    } catch (error) {
      log.error(`❌ 调用图标下载命令失败: ${filename}。错误: ${String(error)}`);
    }
  }
}
