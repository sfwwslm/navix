import {
  BaseDirectory,
  exists,
  readTextFile,
  writeTextFile,
  mkdir,
} from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { log, toErrorMessage } from "./logger";
import { APP_CONFIG_FILE, APP_DEV_CONFIG_FILE } from "@/constants";
import { getAppConfigDir } from "./fs";

// 定义浏览器类型
export type Browser = "default" | "chrome" | "msedge" | "firefox";

// 定义环境类型
export type Environment = "lan" | "wan";

// 定义配置的数据结构类型
interface AppConfig {
  language?: string;
  minimizeToTrayOnClose?: boolean; // 窗口关闭时最小化到系统托盘
  startMinimized?: boolean; // 启动时最小化
  openWithBrowser?: Browser; // 打开网站时使用的浏览器
  launchpadEnvironment?: Environment; // 导航面板的环境
  [key: string]: unknown;
}

/**
 * 返回应用配置文件（config.json）的完整路径。
 * 当前项目将配置目录自定义为 `~/.vust/navix`，因此需要根据环境选择对应的配置文件：
 * - 生产环境：使用 `config.json`
 * - 开发环境：使用 `config.dev.json`
 * 如果改用 `appConfigDir`（由 identifier 自动隔离环境目录），
 * 则无需在文件名层面区分开发与生产配置。
 */
async function getAppConfigFile(): Promise<string> {
  return await join(
    await getAppConfigDir(),
    import.meta.env.PROD ? APP_CONFIG_FILE : APP_DEV_CONFIG_FILE,
  );
}

/**
 * 读取并解析配置文件。
 * @returns {Promise<AppConfig>} 返回配置对象。如果文件不存在或为空，则返回空对象。
 */
async function readConfig(): Promise<AppConfig> {
  const configFile = await getAppConfigFile();
  try {
    if (await exists(configFile)) {
      const content = await readTextFile(configFile);
      if (!content) {
        return {};
      }
      const parsed: unknown = JSON.parse(content);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as AppConfig;
      }
    }
  } catch (error) {
    log.error(
      `读取或解析配置文件失败: ${configFile}, 错误: ${toErrorMessage(error)}`,
    );
  }
  return {}; // 如果文件不存在或发生错误，返回一个空配置对象
}

/**
 * 将配置对象写入配置文件。
 * @param {AppConfig} config - 需要写入的完整配置对象。
 */
async function writeConfig(config: AppConfig): Promise<void> {
  const configFile = await getAppConfigFile();
  const configDir = await getAppConfigDir();
  try {
    // 确保目录存在
    if (!(await exists(configDir))) {
      await mkdir(configDir, {
        baseDir: BaseDirectory.Home,
        recursive: true,
      });
    }
    // 写入文件
    await writeTextFile(configFile, JSON.stringify(config, null, 2));
    log.debug(`配置已成功写入: ${configFile}`);
  } catch (error) {
    log.error(
      `写入配置文件失败: ${configFile}, 错误: ${toErrorMessage(error)}`,
    );
  }
}

/**
 * 从配置文件中获取语言设置。
 * @returns {Promise<string>} 返回语言代码，如果未设置则默认为 'zh'。
 */
export async function getLanguage(): Promise<string> {
  const config = await readConfig();
  return config.language || "zh";
}

/**
 * 将语言设置保存到配置文件中。
 * @param {string} lang - 要保存的语言代码 (例如 'en', 'zh')。
 */
export async function setLanguage(lang: string): Promise<void> {
  const config = await readConfig();
  config.language = lang;
  await writeConfig(config);
}

/**
 * 获取“关闭时最小化到托盘”的设置。
 * @returns {Promise<boolean>} 返回布尔值，如果未设置则默认为 false。
 */
export async function getMinimizeToTrayOnClose(): Promise<boolean> {
  const config = await readConfig();
  return config.minimizeToTrayOnClose ?? false;
}

/**
 * 设置“关闭时最小化到托盘”。
 * @param {boolean} enabled - 是否启用。
 */
export async function setMinimizeToTrayOnClose(
  enabled: boolean,
): Promise<void> {
  const config = await readConfig();
  config.minimizeToTrayOnClose = enabled;
  await writeConfig(config);
}

/**
 * 获取“启动时最小化”的设置
 * @returns {Promise<boolean>} 默认为 true
 */
export async function getStartMinimized(): Promise<boolean> {
  const config = await readConfig();
  return config.startMinimized ?? false;
}

/**
 * 设置“启动时最小化”
 * @param {boolean} enabled - 是否启用
 */
export async function setStartMinimized(enabled: boolean): Promise<void> {
  const config = await readConfig();
  config.startMinimized = enabled;
  await writeConfig(config);
}

/**
 * 获取打开链接时使用的浏览器。
 * @returns {Promise<Browser>} 返回浏览器名称，如果未设置则默认为 'default'。
 */
export async function getOpenWithBrowser(): Promise<Browser> {
  const config = await readConfig();
  return config.openWithBrowser || "default";
}

/**
 * 设置打开链接时使用的浏览器。
 * @param {Browser} browser - 要保存的浏览器名称。
 */
export async function setOpenWithBrowser(browser: Browser): Promise<void> {
  const config = await readConfig();
  config.openWithBrowser = browser;
  await writeConfig(config);
}

/**
 * 获取导航面板的环境设置。
 * @returns {Promise<Environment>} 返回环境名称，如果未设置则默认为 'lan'。
 */
export async function getlaunchpadEnvironment(): Promise<Environment> {
  const config = await readConfig();
  return config.launchpadEnvironment || "lan";
}

/**
 * 设置导航面板的环境。
 * @param {Environment} env - 要保存的环境名称。
 */
export async function setlaunchpadEnvironment(env: Environment): Promise<void> {
  const config = await readConfig();
  config.launchpadEnvironment = env;
  await writeConfig(config);
}
