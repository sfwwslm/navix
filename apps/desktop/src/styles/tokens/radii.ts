/**
 * @file src/styles/tokens/radii.ts
 * @description 定义了应用中所有基础的边框圆角值。
 */
export const radii = {
  /** 小型圆角，用于紧凑的元素，如标签 */
  sm: "5px",
  /** 基础圆角，用于大多数组件，如卡片、输入框 */
  base: "8px",
  /** 大型圆角，用于需要更柔和外观的组件 */
  lg: "12px",
  /** 用于创建圆形元素的圆角值 */
  full: "9999px", // 一个足够大的值，可以确保任何尺寸的元素都变成圆形或胶囊形
  circle: "50%",
};
