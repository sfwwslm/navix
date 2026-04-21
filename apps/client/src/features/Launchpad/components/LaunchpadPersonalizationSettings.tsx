import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { useLaunchpadSettings } from "@/contexts";

const SettingsContainer = styled.div`
  padding: 1rem;
`;

const SettingsArea = styled.div`
  margin-bottom: 2rem;
`;

const AreaTitle = styled.h3`
  font-size: 1.2rem;
  color: ${(props) => props.theme.colors.textPrimary};
  margin-bottom: 1rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  padding-bottom: 0.5rem;
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const SettingLabel = styled.label`
  color: ${(props) => props.theme.colors.textSecondary};
  min-width: 120px;
`;

const SliderInput = styled.input`
  flex-grow: 1;
`;

const SliderValue = styled.span`
  min-width: 40px;
  text-align: right;
  font-weight: bold;
  color: ${(props) => props.theme.colors.primary};
`;

const LaunchpadPersonalizationSettings: React.FC = () => {
  const { t } = useTranslation();
  const { sideMargin: persistedMargin, setSideMargin: setPersistedMargin } =
    useLaunchpadSettings();

  const [liveMargin, setLiveMargin] = useState(persistedMargin);
  const [prevPersistedMargin, setPrevPersistedMargin] =
    useState(persistedMargin);

  if (persistedMargin !== prevPersistedMargin) {
    setPrevPersistedMargin(persistedMargin);
    setLiveMargin(persistedMargin);
  }

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--Launchpad-side-margin-percent",
      `${persistedMargin}`,
    );
  }, [persistedMargin]);
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setLiveMargin(newValue);
    document.documentElement.style.setProperty(
      "--Launchpad-side-margin-percent",
      `${newValue}`,
    );
  };
  const handleDragEnd = () => {
    setPersistedMargin(liveMargin);
  };

  return (
    <SettingsContainer>
      <SettingsArea>
        <AreaTitle>{t("launchpad.settings.contentArea")}</AreaTitle>
        <SettingRow>
          <SettingLabel>{t("launchpad.settings.sideMargin")}</SettingLabel>
          <SliderInput
            type="range"
            min="0"
            max="20"
            value={liveMargin}
            onChange={handleSliderChange} //
            onMouseUp={handleDragEnd} //
            onTouchEnd={handleDragEnd} //
          />
          <SliderValue>{liveMargin}%</SliderValue>
        </SettingRow>
      </SettingsArea>
    </SettingsContainer>
  );
};

export default LaunchpadPersonalizationSettings;
