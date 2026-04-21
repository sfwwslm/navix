/**
 * @file styles/tokens/sizing.ts
 * @description
 * 定义了应用中所有与尺寸相关的基础值。
 * - **结构**: 按组件或用途进行分组，如 `iconButton`, `appHeaderHeight`。
 * - **用途**: 为常用组件和布局元素提供统一的、可复用的尺寸标准。
 */
export const sizing = {
  /** 纯图标按钮的可点击区域尺寸 */
  iconButton: {
    small: "1.2rem",
    medium: "1.5rem",
    large: "1.8rem",
  },
  /** 纯图标按钮中 SVG 图标本身的尺寸 */
  icon: {
    small: "1.2rem",
    medium: "1.5rem",
    large: "1.8rem",
  },
  /** 应用顶部标题栏的高度 */
  appHeaderHeight: "30px",
};
