/**
 * 定义 Web 端支持的语言与文案映射。
 */
export type Locale = "zh-CN" | "en-US";

/**
 * 定义文案字典的递归结构。
 */
export type MessageTree = {
  [key: string]: string | MessageTree;
};
