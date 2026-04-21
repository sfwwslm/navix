import { useState, useCallback, ReactNode } from "react";
import { IconRefreshContext } from "./IconRefresh.context";

/**
 * @component IconRefreshProvider
 */
export const IconRefreshProvider = ({ children }: { children: ReactNode }) => {
  const [iconRetryKey, setIconRetryKey] = useState(0);

  /**
   * @function triggerIconRefresh
   * @description 触发所有动态图标刷新的回调函数
   */
  const triggerIconRefresh = useCallback(() => {
    setIconRetryKey((key) => key + 1);
  }, []);

  return (
    <IconRefreshContext.Provider value={{ iconRetryKey, triggerIconRefresh }}>
      {children}
    </IconRefreshContext.Provider>
  );
};
