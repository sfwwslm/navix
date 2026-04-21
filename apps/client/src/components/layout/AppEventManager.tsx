import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { emit } from "@tauri-apps/api/event";

/**
 * @component AppEventManager
 */
const AppEventManager: React.FC = () => {
  const { i18n, t } = useTranslation();
  useEffect(() => {
    const updateTrayMenu = () => {
      void emit("update-tray-menu", {
        title: t("tray.title"),
        quit: t("tray.quit"),
      });
    };
    updateTrayMenu();
    i18n.on("languageChanged", updateTrayMenu);
    return () => {
      i18n.off("languageChanged", updateTrayMenu);
    };
  }, [i18n, t]);
  return null;
};

export default AppEventManager;
