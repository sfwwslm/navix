import { useContext } from "react";
import { I18nContext } from "./context";

/**
 * 读取多语言与界面偏好上下文。
 */
export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
};
