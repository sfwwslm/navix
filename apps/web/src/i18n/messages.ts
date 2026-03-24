import type { Locale, MessageTree } from "./types";
import { enUSMessages } from "./locales/en-US";
import { zhCNMessages } from "./locales/zh-CN";

/**
 * 聚合所有语言文案。
 */
export const messages: Record<Locale, MessageTree> = {
  "zh-CN": zhCNMessages,
  "en-US": enUSMessages,
};
