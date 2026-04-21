import { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import styled from "styled-components";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useTranslation } from "react-i18next";
import Tooltip from "@/components/common/Tooltip/Tooltip";
import { IoBugOutline, IoLogoGithub } from "react-icons/io5";
import { GITHUB_ISSUES_URL, GITHUB_REPO_URL } from "@/constants/links";

const AboutContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  background-color: transparent;
  color: ${(props) => props.theme.colors.textPrimary};
`;

const Content = styled.div`
  text-align: center;
  max-width: 80%;
  margin-top: -20vh;
  color: ${(props) => props.theme.colors.textPrimary};

  p {
    font-weight: bold;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
  }
`;

const Version = styled.div`
  position: absolute;
  right: 3rem;
  bottom: 1.5rem;
  font-size: 0.9rem;
  font-weight: bold;
  text-align: left;
  color: ${(props) => props.theme.colors.textPrimary};

  p {
    cursor: pointer;
    &:hover {
      color: ${(props) => props.theme.colors.primary};
    }
  }
`;

const BottomActions = styled.div`
  position: absolute;
  left: 3rem;
  bottom: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const IconButton = styled.button`
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  border: 1px solid ${(props) => props.theme.colors.primary};
  background: transparent;
  color: ${(props) => props.theme.colors.textPrimary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 1.2rem;
    height: 1.2rem;
  }

  &:hover {
    background: ${(props) => props.theme.colors.primary};
    color: ${(props) => props.theme.colors.textOnPrimary};
  }
`;

const Paragraph = styled.p`
  font-size: 1rem;
  font-weight: bold;
  margin-bottom: 1rem;
`;

export default function About() {
  const [appVersion, setAppVersion] = useState("...");
  const { t } = useTranslation();
  const githubUrl = GITHUB_REPO_URL;
  const issuesUrl = GITHUB_ISSUES_URL;

  useEffect(() => {
    void getVersion().then(setAppVersion);
  }, []);

  return (
    <AboutContainer className="about-container">
      <Content>
        <Paragraph>{t("help.about.tagline")}</Paragraph>
      </Content>
      <Version className="version" style={{ display: "grid" }}>
        <Tooltip text={`Commit: ${__GIT_HASH__}`}>
          <p style={{ cursor: "default", color: "inherit" }}>
            Version: {appVersion}
          </p>
        </Tooltip>
      </Version>
      <BottomActions>
        <Tooltip text="GitHub">
          <IconButton
            onClick={() => {
              void openUrl(githubUrl);
            }}
          >
            <IoLogoGithub />
          </IconButton>
        </Tooltip>
        <Tooltip text="Issues">
          <IconButton
            onClick={() => {
              void openUrl(issuesUrl);
            }}
          >
            <IoBugOutline />
          </IconButton>
        </Tooltip>
      </BottomActions>
    </AboutContainer>
  );
}
