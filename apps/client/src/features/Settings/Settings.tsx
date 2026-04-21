import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { SettingsSection, Label } from "./Settings.styles";
import styled from "styled-components";
import { log } from "@/utils/logger";
import {
  getMinimizeToTrayOnClose,
  setMinimizeToTrayOnClose,
  getStartMinimized,
  setStartMinimized,
} from "@/utils/config";

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  /** */
  & + & {
    margin-top: 0.8rem;
  }
`;

const SettingItem = styled.div`
  margin-bottom: 1.5rem;
  &:last-child {
    margin-bottom: 0;
  }
`;

const SwitchContainer = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const SwitchInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
`;

const SwitchSlider = styled.span`
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  background-color: ${(props) => props.theme.colors.border};
  border-radius: 22px;
  transition: background-color 0.2s;

  &::before {
    content: "";
    position: absolute;
    height: 18px;
    width: 18px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }

  ${SwitchInput}:checked + & {
    background-color: ${(props) => props.theme.colors.primary};
  }

  ${SwitchInput}:checked + &::before {
    transform: translateX(18px);
  }
`;

const Description = styled.p`
  font-size: 0.85rem;
  color: ${(props) => props.theme.colors.textSecondary};
  margin: 0;
`;

const PersonalizationSettings: React.FC = () => {
  const { t } = useTranslation();
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [startMinimizedEnabled, setStartMinimizedEnabled] = useState(false);
  const [minimizeOnCloseEnabled, setMinimizeOnCloseEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const [isAutostart, isMinimizeOnClose, isStartMinimized] =
          await Promise.all([
            isEnabled(),
            getMinimizeToTrayOnClose(),
            getStartMinimized(),
          ]);
        if (isMounted) {
          setAutostartEnabled(isAutostart);
          setMinimizeOnCloseEnabled(isMinimizeOnClose);
          setStartMinimizedEnabled(isStartMinimized);
        }
      } catch (error) {
        log.error(`检查设置状态失败: ${String(error)}`);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    void checkStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAutostartToggle = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const shouldEnable = e.target.checked;
    try {
      if (shouldEnable) {
        await enable();
      } else {
        await disable();
      }
      setAutostartEnabled(shouldEnable);
    } catch (error) {
      log.error(`设置自启动失败: ${String(error)}`);
      setAutostartEnabled(!shouldEnable);
    }
  };

  const handleStartMinimizedToggle = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const shouldEnable = e.target.checked;
    await setStartMinimized(shouldEnable);
    setStartMinimizedEnabled(shouldEnable);
  };

  const handleMinimizeOnCloseToggle = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const shouldEnable = e.target.checked;
    await setMinimizeToTrayOnClose(shouldEnable);
    setMinimizeOnCloseEnabled(shouldEnable);
  };

  return (
    <SettingsSection>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* “启动”设置组 */}
          <SettingItem>
            <Label>{t("settingsPage.menu.settings.autostart")}</Label>
            <SettingRow>
              <SwitchContainer>
                <SwitchInput
                  type="checkbox"
                  checked={autostartEnabled}
                  onChange={(e) => {
                    void handleAutostartToggle(e);
                  }}
                />
                <SwitchSlider />
              </SwitchContainer>
              <Description>
                {t("settingsPage.menu.settings.autostartDescription")}
              </Description>
            </SettingRow>
            {/* 启动后最小化 - 使用 SettingRow 移除缩进 */}
            <SettingRow>
              <SwitchContainer>
                <SwitchInput
                  type="checkbox"
                  checked={startMinimizedEnabled}
                  onChange={(e) => {
                    void handleStartMinimizedToggle(e);
                  }}
                />
                <SwitchSlider />
              </SwitchContainer>
              <Description>
                {t("settingsPage.menu.settings.startMinimized")}
              </Description>
            </SettingRow>
          </SettingItem>

          {/* “主窗口”设置组 */}
          <SettingItem>
            <Label>{t("settingsPage.menu.settings.minimizeToTray")}</Label>
            <SettingRow>
              <SwitchContainer>
                <SwitchInput
                  type="checkbox"
                  checked={minimizeOnCloseEnabled}
                  onChange={(e) => {
                    void handleMinimizeOnCloseToggle(e);
                  }}
                />
                <SwitchSlider />
              </SwitchContainer>
              <Description>
                {t("settingsPage.menu.settings.minimizeToTrayDescription")}
              </Description>
            </SettingRow>
          </SettingItem>
        </>
      )}
    </SettingsSection>
  );
};

export default PersonalizationSettings;
