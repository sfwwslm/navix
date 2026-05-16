import { createContext } from "react";
import type { Locale } from "./types";

export type ThemeName = "light" | "dark";
export type BackgroundName = "orbital" | "mesh" | "aurora";
export type ContentInset = number;
export type TranslationValues = Record<string, string | number>;

export type I18nContextValue = {
  locale: Locale;
  themeName: ThemeName;
  backgroundName: BackgroundName;
  contentInset: ContentInset;
  launchpadSidebarEnabled: boolean;
  setLocale: (locale: Locale) => void;
  setContentInset: (contentInset: ContentInset) => void;
  setLaunchpadSidebarEnabled: (enabled: boolean) => void;
  toggleTheme: () => void;
  cycleBackground: () => void;
  t: (key: string, values?: TranslationValues) => string;
};

/**
 * 定义国际化与界面偏好上下文。
 */
export const I18nContext = createContext<I18nContextValue | null>(null);
