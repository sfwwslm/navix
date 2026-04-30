import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyWebTheme } from "@navix/shared-ui";
import { I18nContext } from "./context";
import { messages } from "./messages";
import type { Locale } from "./types";

type ThemeName = "light" | "dark";
type BackgroundName = "orbital" | "mesh" | "aurora";
type ContentInset = number;

type TranslationValues = Record<string, string | number>;

const LOCALE_KEY = "appLocale";
const THEME_KEY = "appTheme";
const BACKGROUND_KEY = "appBackground";
const CONTENT_INSET_KEY = "appContentInset";
const LAUNCHPAD_SIDEBAR_KEY = "appLaunchpadSidebarEnabled";
const CONTENT_INSET_DEBOUNCE_MS = 120;
const BACKGROUND_ORDER: BackgroundName[] = ["orbital", "mesh", "aurora"];
const DEFAULT_CONTENT_INSET = 24;
const MIN_CONTENT_INSET = 8;
const MAX_CONTENT_INSET = 120;
const backgroundImageMap: Record<BackgroundName, string> = {
  orbital: "url('/backgrounds/orbital-grid.svg')",
  mesh: "url('/backgrounds/mesh-wave.svg')",
  aurora: "url('/backgrounds/aurora-sheet.svg')",
};

/**
 * 从 localStorage 读取语言偏好。
 */
const getInitialLocale = (): Locale => {
  if (typeof window === "undefined") {
    return "zh-CN";
  }

  const stored = window.localStorage.getItem(LOCALE_KEY);
  if (stored === "zh-CN" || stored === "en-US") {
    return stored;
  }

  const browserLocale =
    window.navigator.languages?.[0] || window.navigator.language || "zh-CN";
  return browserLocale.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
};

/**
 * 从 localStorage 读取主题偏好。
 */
const getInitialTheme = (): ThemeName => {
  if (typeof window === "undefined") {
    return "dark";
  }
  return window.localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
};

/**
 * 从 localStorage 读取背景偏好。
 */
const getInitialBackground = (): BackgroundName => {
  if (typeof window === "undefined") {
    return "orbital";
  }
  const stored = window.localStorage.getItem(BACKGROUND_KEY);
  return stored === "mesh" || stored === "aurora" ? stored : "orbital";
};

/**
 * 从 localStorage 读取内容区域边距偏好。
 */
const getInitialContentInset = (): ContentInset => {
  if (typeof window === "undefined") {
    return DEFAULT_CONTENT_INSET;
  }

  const stored = Number(window.localStorage.getItem(CONTENT_INSET_KEY));
  if (Number.isNaN(stored)) {
    return DEFAULT_CONTENT_INSET;
  }

  return Math.min(MAX_CONTENT_INSET, Math.max(MIN_CONTENT_INSET, stored));
};

/**
 * 从 localStorage 读取 Launchpad 侧栏偏好。
 */
const getInitialLaunchpadSidebarEnabled = (): boolean => {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(LAUNCHPAD_SIDEBAR_KEY) !== "false";
};

/**
 * 根据路径查找当前语言下的文案。
 */
const resolveMessage = (locale: Locale, key: string): string | null => {
  const parts = key.split(".");
  let current: string | Record<string, unknown> = messages[locale];

  for (const part of parts) {
    if (typeof current !== "object" || current === null || !(part in current)) {
      return null;
    }
    current = current[part] as string | Record<string, unknown>;
  }

  return typeof current === "string" ? current : null;
};

/**
 * 应用模板变量替换。
 */
const interpolate = (template: string, values?: TranslationValues) => {
  if (!values) {
    return template;
  }

  return Object.entries(values).reduce((result, [name, value]) => {
    return result.replaceAll(`{{${name}}}`, String(value));
  }, template);
};

/**
 * 提供 Web 应用的语言、主题、背景和布局偏好上下文。
 */
export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);
  const [themeName, setThemeName] = useState<ThemeName>(getInitialTheme);
  const [backgroundName, setBackgroundName] =
    useState<BackgroundName>(getInitialBackground);
  const [contentInset, setContentInset] = useState<ContentInset>(
    getInitialContentInset,
  );
  const [launchpadSidebarEnabled, setLaunchpadSidebarEnabled] = useState(
    getInitialLaunchpadSidebarEnabled,
  );

  const translate = useCallback(
    (key: string, values?: TranslationValues) => {
      const message =
        resolveMessage(locale, key) ?? resolveMessage("zh-CN", key) ?? key;
      return interpolate(message, values);
    },
    [locale],
  );

  useEffect(() => {
    applyWebTheme(themeName);
    window.localStorage.setItem(THEME_KEY, themeName);
    document.documentElement.dataset.appTheme = themeName;
  }, [themeName]);

  useEffect(() => {
    window.localStorage.setItem(LOCALE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    window.localStorage.setItem(BACKGROUND_KEY, backgroundName);
    document.documentElement.style.setProperty(
      "--app-background-image",
      backgroundImageMap[backgroundName],
    );
    document.documentElement.dataset.appBackground = backgroundName;
  }, [backgroundName]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      window.localStorage.setItem(CONTENT_INSET_KEY, String(contentInset));
      document.documentElement.style.setProperty(
        "--app-content-inset",
        `${contentInset}px`,
      );
    }, CONTENT_INSET_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [contentInset]);

  useEffect(() => {
    window.localStorage.setItem(
      LAUNCHPAD_SIDEBAR_KEY,
      String(launchpadSidebarEnabled),
    );
  }, [launchpadSidebarEnabled]);

  const value = useMemo(() => {
    return {
      locale,
      themeName,
      backgroundName,
      contentInset,
      launchpadSidebarEnabled,
      setLocale,
      setContentInset: (nextContentInset: ContentInset) => {
        setContentInset(
          Math.min(
            MAX_CONTENT_INSET,
            Math.max(MIN_CONTENT_INSET, Math.round(nextContentInset)),
          ),
        );
      },
      setLaunchpadSidebarEnabled,
      toggleTheme: () => {
        setThemeName((prev) => (prev === "dark" ? "light" : "dark"));
      },
      cycleBackground: () => {
        setBackgroundName((prev) => {
          const currentIndex = BACKGROUND_ORDER.indexOf(prev);
          return BACKGROUND_ORDER[(currentIndex + 1) % BACKGROUND_ORDER.length];
        });
      },
      t: translate,
    };
  }, [
    backgroundName,
    contentInset,
    launchpadSidebarEnabled,
    locale,
    themeName,
    translate,
  ]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
