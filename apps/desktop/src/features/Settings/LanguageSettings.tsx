import React from "react";
import { useTranslation } from "react-i18next";
import { SettingsSection, Label, SelectWrapper } from "./Settings.styles";
import { setLanguage } from "@/utils/config";
import CustomSelect from "@/components/common/CustomSelect/CustomSelect";

const LanguageSettings: React.FC = () => {
  const { t, i18n } = useTranslation();

  const languageOptions = [
    { value: "zh", label: "简体中文" },
    { value: "en", label: "English" },
  ];

  const handleLanguageChange = async (value: string | number) => {
    const newLang = value as string;
    await setLanguage(newLang);
    void i18n.changeLanguage(newLang);
  };

  return (
    <SettingsSection className="language-settings-section">
      <div>
        <Label htmlFor="language-select">
          {t("settingsPage.menu.settings.languageTitle")}
        </Label>
        <SelectWrapper>
          <CustomSelect
            options={languageOptions}
            value={i18n.language}
            onChange={(value) => {
              void handleLanguageChange(value);
            }}
          />
        </SelectWrapper>
      </div>
    </SettingsSection>
  );
};

export default LanguageSettings;
