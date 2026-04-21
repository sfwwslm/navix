import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SettingsSection, Label, SelectWrapper } from "./Settings.styles";
import {
  getOpenWithBrowser,
  setOpenWithBrowser,
  Browser,
} from "@/utils/config";
import CustomSelect from "@/components/common/CustomSelect/CustomSelect";
import { log } from "@/utils/logger";
import { callTauri } from "@/services/tauri";

// 定义从后端获取的浏览器信息结构
interface DetectedBrowser {
  id: Browser;
  name: string;
  installed: boolean;
}

const BrowserSettings: React.FC = () => {
  const { t } = useTranslation();
  const [selectedBrowser, setSelectedBrowser] = useState<Browser>("default");
  const [browserOptions, setBrowserOptions] = useState<
    { value: Browser; label: string; disabled?: boolean }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettingsAndDetectBrowsers = async () => {
      setIsLoading(true);
      try {
        const savedBrowser = await getOpenWithBrowser();
        setSelectedBrowser(savedBrowser);

        const detectedBrowsers: DetectedBrowser[] = await callTauri(
          "detect_installed_browsers",
        );

        const options = [
          {
            value: "default" as Browser,
            label: t("settingsPage.browser.default"),
          },
          ...detectedBrowsers.map((browser) => ({
            value: browser.id,
            label: `${browser.name}${
              !browser.installed
                ? ` (${t("settingsPage.browser.notDetected")})`
                : ""
            }`,
            disabled: !browser.installed,
          })),
        ];

        setBrowserOptions(options);
      } catch (error) {
        log.error(`加载浏览器设置失败: ${String(error)}`);
        // 如果检测失败，提供基础选项
        setBrowserOptions([
          { value: "default", label: t("settingsPage.browser.default") },
          { value: "chrome", label: "Google Chrome" },
          { value: "msedge", label: "Microsoft Edge" },
          { value: "firefox", label: "Mozilla Firefox" },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettingsAndDetectBrowsers();
  }, [t]);

  const handleBrowserChange = async (value: string | number) => {
    const newBrowser = value as Browser;
    await setOpenWithBrowser(newBrowser);
    setSelectedBrowser(newBrowser);
  };

  if (isLoading) {
    return <p>{t("common.loading")}</p>;
  }

  return (
    <SettingsSection className="browser-settings-section">
      <div>
        <Label htmlFor="browser-select">
          {t("settingsPage.browser.title")}
        </Label>
        <SelectWrapper>
          <CustomSelect
            options={browserOptions}
            value={selectedBrowser}
            onChange={(value) => {
              void handleBrowserChange(value);
            }}
          />
        </SelectWrapper>
      </div>
    </SettingsSection>
  );
};

export default BrowserSettings;
