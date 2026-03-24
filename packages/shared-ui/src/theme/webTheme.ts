import { colorPalette } from "./colorPalette";

export type WebThemeName = "light" | "dark";

export const webThemeVars: Record<WebThemeName, Record<string, string>> = {
  light: {
    "--nu-color-primary": colorPalette.cyan["500"],
    "--nu-color-bg": "#f3f6fb",
    "--nu-color-surface": "#ffffff",
    "--nu-color-text-primary": "#172133",
    "--nu-color-text-secondary": "#4c5b76",
    "--nu-color-header-bg": "rgba(255, 255, 255, 0.85)",
    "--nu-color-header-text": "#121826",
    "--nu-color-header-border": "rgba(17, 24, 39, 0.12)",
    "--nu-color-header-hover-bg": "rgba(0, 0, 0, 0.08)",
    "--nu-color-header-hover-shadow": "rgba(90, 102, 120, 0.3)",
  },
  dark: {
    "--nu-color-primary": colorPalette.cyan["500"],
    "--nu-color-bg": "#0f1420",
    "--nu-color-surface": "#171f2e",
    "--nu-color-text-primary": "#e4ebf8",
    "--nu-color-text-secondary": "#a8b4cd",
    "--nu-color-header-bg": "rgba(18, 26, 40, 0.88)",
    "--nu-color-header-text": "#e8eefc",
    "--nu-color-header-border": "rgba(102, 125, 160, 0.26)",
    "--nu-color-header-hover-bg": "rgba(255, 255, 255, 0.08)",
    "--nu-color-header-hover-shadow": "rgba(140, 180, 255, 0.2)",
  },
};

export const applyWebTheme = (themeName: WebThemeName) => {
  if (typeof document === "undefined") {
    return;
  }

  const vars = webThemeVars[themeName];
  for (const [key, value] of Object.entries(vars)) {
    document.documentElement.style.setProperty(key, value);
  }
  document.documentElement.dataset.nuTheme = themeName;
};
