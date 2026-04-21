import { createContext, useContext } from "react";

/**
 * @interface LaunchpadSettingsContextType
 * @description 导航面板设置对话框使用的 Context 数据结构。
 */
export interface LaunchpadSettingsContextType {
  sideMargin: number;
  setSideMargin: (margin: number) => void;
}

/**
 * @const LaunchpadSettingsContext
 * @description React Context 对象，用于在组件树中传递设置。
 */
export const LaunchpadSettingsContext = createContext<
  LaunchpadSettingsContextType | undefined
>(undefined);

/**
 * @hook useLaunchpadSettings
 * @description 一个自定义 Hook，简化了对 LaunchpadSettingsContext 的访问。
 */
export const useLaunchpadSettings = () => {
  const context = useContext(LaunchpadSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useLaunchpadSettings must be used within a LaunchpadSettingsProvider",
    );
  }
  return context;
};
