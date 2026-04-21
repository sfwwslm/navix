import { createContext, useContext } from "react";

/**
 * @interface IconRefreshContextType
 * @description 定义 Context 数据结构
 */
export interface IconRefreshContextType {
  iconRetryKey: number;
  triggerIconRefresh: () => void;
}

export const IconRefreshContext = createContext<
  IconRefreshContextType | undefined
>(undefined);

/**
 * @hook useIconRefresh
 * @description 用于访问 IconRefreshContext 的自定义 Hook
 */
export const useIconRefresh = () => {
  const context = useContext(IconRefreshContext);
  if (!context) {
    throw new Error(
      "useIconRefresh must be used within an IconRefreshProvider",
    );
  }
  return context;
};
