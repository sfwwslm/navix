import React from "react";
import styled from "styled-components";
import { GlobalStyle } from "@/styles/GlobalStyles";
import { darkTheme } from "@/styles/themes";
import { ThemeProvider } from "styled-components";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  HOME_VUST_DIR,
  APP_CONFIG_DIR,
  APP_DATA_DIR,
  APP_DATABASE_FILE,
  APP_DEV_DATABASE_FILE,
} from "@/constants";

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  padding: 2rem;
  box-sizing: border-box;
  text-align: center;
  background-color: ${darkTheme.colors.background};
  color: ${darkTheme.colors.textPrimary};
`;

const ErrorTitle = styled.h1`
  font-size: 2rem;
  color: ${darkTheme.colors.error};
  margin-bottom: 1rem;
`;

const ErrorMessage = styled.p`
  font-size: 1.1rem;
  color: ${darkTheme.colors.textSecondary};
  max-width: 600px;
  line-height: 1.6;
`;

const CodeBlock = styled.code`
  background-color: ${darkTheme.colors.surface};
  border: 1px solid ${darkTheme.colors.border};
  padding: 0.5rem 1rem;
  border-radius: 6px;
  margin: 1rem 0;
  display: inline-block;
  color: ${darkTheme.colors.textPrimary};
  font-family: "Courier New", Courier, monospace;
`;

const ExitButton = styled.button`
  margin-top: 2.5rem;
  padding: 12px 28px;
  border: 1px solid ${darkTheme.colors.border};
  border-radius: 8px;
  background-color: ${darkTheme.colors.surface};
  color: ${darkTheme.colors.textPrimary};
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: ${darkTheme.colors.error};
    color: white;
    border-color: ${darkTheme.colors.error};
  }
`;

interface InitializationErrorProps {
  error: Error;
}

const InitializationError: React.FC<InitializationErrorProps> = ({ error }) => {
  const isMigrationError = error.message.includes("migration");
  const dbFileName = import.meta.env.PROD
    ? APP_DATABASE_FILE
    : APP_DEV_DATABASE_FILE;

  const handleExit = () => {
    void getCurrentWindow().close();
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <GlobalStyle />
      <ErrorContainer>
        <ErrorTitle>应用初始化失败</ErrorTitle>
        <ErrorMessage>
          应用启动过程中发生了无法自动恢复的严重错误，请尝试重新启动应用。
        </ErrorMessage>

        {isMigrationError && (
          <>
            <ErrorMessage>
              <br />
              最简单的处理方式是删除旧数据库文件，应用下次启动时会自动重建。
              <br />
            </ErrorMessage>
            <CodeBlock>{`数据库文件路径: ~/${HOME_VUST_DIR}/${APP_CONFIG_DIR}/${APP_DATA_DIR}/${dbFileName}`}</CodeBlock>
          </>
        )}

        <details style={{ marginTop: "2rem", width: "100%" }}>
          <summary
            style={{
              cursor: "pointer",
              color: darkTheme.colors.textSecondary,
            }}
          >
            点击查看详细错误信息
          </summary>
          <CodeBlock
            style={{
              maxWidth: "80vw",
              overflow: "auto",
              textAlign: "left",
              marginTop: "1rem",
            }}
          >
            {error.message}
          </CodeBlock>
        </details>

        <ExitButton onClick={handleExit}>退出应用</ExitButton>
      </ErrorContainer>
    </ThemeProvider>
  );
};

export default InitializationError;
