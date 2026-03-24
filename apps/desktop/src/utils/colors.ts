/**
 * @file src/utils/colors.ts
 * @description 颜色相关的公共辅助函数
 */

/**
 * 将一个十六进制颜色值转换为带有指定透明度的 RGBA 格式。
 * 支持 3 位和 6 位十六进制码。
 * @param {string} hex - 需要转换的十六进制颜色字符串 (e.g., "#FFF", "#FF5733")。
 * @param {number} alpha - 透明度，介于 0 (完全透明) 和 1 (完全不透明) 之间。
 * @returns {string} - RGBA 格式的颜色字符串 (e.g., "rgba(255, 87, 51, 0.5)")。
 */
export const hexToRgba = (hex: string, alpha: number): string => {
  // 移除可能存在的 '#' 号
  let cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;

  // 如果是 3 位十六进制，则扩展为 6 位
  // 例如： "FFF" -> "FFFFFF"
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  // 解析 R, G, B 分量
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // 确保 alpha 值在 0 和 1 之间
  const safeAlpha = Math.max(0, Math.min(1, alpha));

  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
};
