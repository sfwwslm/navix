/**
 * @file styles/tokens/spacing.ts
 * @description
 * 定义了应用中所有与间距相关的基础值。
 * - **结构**: 基于一个基础单位 (`unit`) 进行扩展，确保所有间距都是该单位的倍数，形成和谐的视觉网格。
 * - **用途**: 用于 `margin`, `padding`, `gap` 等所有需要间距的场景。
 */
export const spacing = {
  /** 8px, 作为 1 个间距单位 */
  unit: "8px",
  /** 页面/组件边缘的微小间距 */
  edge: "2px",
};
