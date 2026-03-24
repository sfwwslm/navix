import { openUrl } from "@tauri-apps/plugin-opener";
import { getOpenWithBrowser } from "./config";
import { log } from "@/utils/logger";

/**
 * @function openLink
 * @description 根据用户配置，使用指定的浏览器打开一个URL。
 * @param {string} url - 要打开的URL。
 */
export const openLink = async (url: string): Promise<void> => {
  try {
    const browser = await getOpenWithBrowser();
    if (browser === "default") {
      await openUrl(url);
    } else {
      await openUrl(url, browser);
    }
  } catch (error) {
    log.error(`打开链接失败: ${url}, 错误: ${String(error)}`);
  }
};
