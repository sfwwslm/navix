/**
 * @file styles/tokens/typography.ts
 * @description
 * 定义了应用中所有与字体和排版相关的基础值。
 */
export const typography = {
  /**
   * 应用的全局字体栈。
   * 优先使用系统UI字体，确保在不同操作系统上都有最佳的本地化体验。
   */
  fontFamily: '"Microsoft YaHei", Inter, Avenir, Helvetica, Arial, sans-serif',
  /**
   * 预定义的字号体系。
   */
  fontSizes: {
    /** 基础字号，用于正文 */
    base: "14px",
    /** 菜单字号 */
    menu: "0.9rem",
  },
};
