/**
 * @file src/utils/url.ts
 * @description URL相关的公共辅助函数
 */

/**
 * @function isValidUrl
 * @description 验证给定的字符串是否为有效的URL格式。
 * @param {string} urlString - 需要验证的URL字符串。
 * @returns {boolean} - 如果字符串是有效的URL则返回true，否则返回false。
 */
export const isValidUrl = (urlString: string): boolean => {
  if (!urlString) return false;
  try {
    // 使用URL构造函数来验证。如果字符串不是有效的URL，它会抛出一个错误。
    new URL(urlString);
    return true;
  } catch (_e) {
    return false;
  }
};
