import styles from "./PreferenceDock.module.css";
import { useI18n } from "../i18n/useI18n";

/**
 * 渲染偏好设置浮动面板，提供语言、主题与背景图的全局切换入口。
 */
const PreferenceDock = () => {
  const {
    locale,
    setLocale,
    themeName,
    toggleTheme,
    backgroundName,
    cycleBackground,
    t,
  } = useI18n();

  const languageLabel = `${t("preferences.language")}: ${t("common.localeShort")}`;
  const themeLabel = `${t("preferences.theme")}: ${
    themeName === "dark"
      ? t("preferences.themeDark")
      : t("preferences.themeLight")
  }`;
  const backgroundLabel = `${t("preferences.background")}: ${
    backgroundName === "mesh"
      ? t("preferences.backgroundMesh")
      : backgroundName === "aurora"
        ? t("preferences.backgroundAurora")
        : t("preferences.backgroundOrbital")
  }`;

  return (
    <aside
      className={`preference-dock ${styles.dock}`}
      aria-label="preferences"
      data-ui="preference-dock"
    >
      <button
        aria-label={languageLabel}
        className={`preference-dock-button preference-dock-language ${styles.button}`}
        data-ui="preference-dock-language-button"
        onClick={() => setLocale(locale === "zh-CN" ? "en-US" : "zh-CN")}
        title={languageLabel}
        type="button"
      >
        <svg
          aria-hidden="true"
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 3a9 9 0 1 0 0 18m0-18c2.4 2.19 3.75 5.28 3.75 9S14.4 18.81 12 21m0-18C9.6 5.19 8.25 8.28 8.25 12S9.6 18.81 12 21m-8.25-9h16.5M4.96 7.5h14.08M4.96 16.5h14.08"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
        <span className={styles.badge}>{t("common.localeShort")}</span>
      </button>
      <button
        aria-label={themeLabel}
        className={`preference-dock-button preference-dock-theme ${styles.button}`}
        data-ui="preference-dock-theme-button"
        onClick={toggleTheme}
        title={themeLabel}
        type="button"
      >
        {themeName === "dark" ? (
          <svg
            aria-hidden="true"
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 3v2.25M12 18.75V21M4.72 4.72l1.59 1.59M17.69 17.69l1.59 1.59M3 12h2.25M18.75 12H21M4.72 19.28l1.59-1.59M17.69 6.31l1.59-1.59M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M20.354 15.354A8.5 8.5 0 0 1 8.646 3.646 8.5 8.5 0 1 0 20.354 15.354Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        )}
      </button>
      <button
        aria-label={backgroundLabel}
        className={`preference-dock-button preference-dock-background ${styles.button}`}
        data-ui="preference-dock-background-button"
        onClick={cycleBackground}
        title={backgroundLabel}
        type="button"
      >
        <svg
          aria-hidden="true"
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M4.75 6.75A1.75 1.75 0 0 1 6.5 5h11A1.75 1.75 0 0 1 19.25 6.75v10.5A1.75 1.75 0 0 1 17.5 19h-11a1.75 1.75 0 0 1-1.75-1.75V6.75Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
          <path
            d="m7 15 2.5-2.5 2.25 2.25L15.5 11l1.5 1.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
          <path
            d="M8.25 9.25h.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.2"
          />
        </svg>
      </button>
    </aside>
  );
};

export default PreferenceDock;
