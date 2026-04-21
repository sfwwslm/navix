import { colorPalette } from "./tokens/colors";
import { zIndices } from "./tokens/zIndex";
import { sizing } from "./tokens/sizing";
import { borderWidths } from "./tokens/borderWidths";
import { radii } from "./tokens/radii";
import { typography } from "./tokens/typography";
import { spacing } from "./tokens/spacing";

/**
 * @theme lightTheme
 * @description 应用的浅色主题。
 * 该对象将全局令牌（如 `colorPalette`）映射为具有语义的、供组件使用的设计令牌。
 */
export const lightTheme = {
  /** 通用字体 */
  typography: {
    fontFamily: typography.fontFamily,
    fontSizeBase: typography.fontSizes.base,
    menuFontSize: typography.fontSizes.menu,
  },

  zIndices,

  sizing: {
    appHeaderHeight: sizing.appHeaderHeight,
  },

  spacing: {
    unit: spacing.unit,
    headerMargin: spacing.edge,
  },

  iconButton: {
    size: sizing.iconButton,
  },

  /** 边框粗细 */
  borderWidths: {
    /** 标准边框宽度 */
    standard: borderWidths.sm,
    /** 焦点或高亮状态下的边框宽度 */
    focus: borderWidths.md,
  },

  /** 边框圆角 */
  radii: {
    /** 适用于大多数组件的基础圆角 */
    base: radii.base,
    /** 适用于较小组件（如下拉菜单项）的圆角 */
    small: radii.sm,
    /** 适用于需要完全圆形外观的组件 */
    circle: radii.circle,
    /** 适用于胶囊形状的按钮或输入框 */
    pill: radii.full,
  },

  /** 颜色 */
  colors: {
    // 基础语义
    primary: colorPalette.cyan[500],
    secondary: colorPalette.cyan[500],

    // 背景
    background: colorPalette.gray[100],
    surface: colorPalette.gray[50],

    // 文本
    textPrimary: colorPalette.gray[800],
    textSecondary: colorPalette.gray[700],
    textHint: colorPalette.gray[600], // 提示文本颜色
    textOnPrimary: colorPalette.gray[50], // 在主色背景上的文字颜色
    codeBackground: colorPalette.cyan[500],

    // 边框
    border: colorPalette.gray[200],

    // 状态
    success: colorPalette.green[500],
    error: colorPalette.red[500],
    warning: colorPalette.orange[500],
    highlight: colorPalette.yellow[300],

    // 透明色变体
    primaryFocus: "rgba(0, 188, 212, 0.4)",
    secondaryTransparent: "rgba(103, 58, 183, 0.9)",
    overlayBackground: "rgba(0, 0, 0, 0)",

    // 组件特定颜色
    header: {
      background: colorPalette.gray[50],
      text: colorPalette.gray[950],
      border: colorPalette.gray[300],
      // 菜单栏相关颜色
      hoverBackground: "rgba(0, 0, 0, 0.1)",
      hoverShadow: "rgba(100, 100, 100, 0.3)",
    },
    // ... 其他组件特定颜色
  },
};

/**
 * @theme darkTheme
 * @description 应用的深色主题。
 */
export const darkTheme = {
  ...lightTheme, // 继承 lightTheme 的所有非颜色属性

  /** 颜色 */
  colors: {
    primary: colorPalette.cyan[500],
    secondary: colorPalette.purple[500],

    background: colorPalette.blueGray[900],
    surface: colorPalette.blueGray[800],

    textPrimary: colorPalette.gray[200],
    textSecondary: colorPalette.gray[300], // 在暗色模式下，次要文字应该更亮
    textHint: colorPalette.gray[600], // 提示文本颜色
    textOnPrimary: colorPalette.gray[50],
    codeBackground: colorPalette.cyan[500],

    border: colorPalette.blueGray[700],

    success: colorPalette.green[500],
    error: colorPalette.red[500],
    warning: colorPalette.orange[500],
    highlight: colorPalette.yellow[300],

    primaryFocus: "rgba(0, 188, 212, 0.4)",
    secondaryTransparent: "rgba(103, 58, 183, 0.9)",
    overlayBackground: "rgba(0, 0, 0, 0)",

    header: {
      background: colorPalette.blueGray[900],
      text: colorPalette.gray[200],
      border: colorPalette.gray[800],
      hoverBackground: "rgba(255, 255, 255, 0.1)",
      hoverShadow: "rgba(160, 180, 240, 0.2)",
    },
  },
};

export type Theme = typeof lightTheme; // 定义 Theme 类型，方便 styled-components 自动推断
