import { GlobalStyle } from "@/styles/GlobalStyles";
import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Menus from "@/components/layout/Menus";
import WindowControls from "@/components/layout/WindowControls";
import { attachConsole } from "@tauri-apps/plugin-log";
import styled from "styled-components";
import { AppProvider } from "@/contexts/AppProvider";
import AppEventManager from "@/components/layout/AppEventManager";
import { useAuth } from "@/contexts/Auth.context";
import { getAllUsers, ANONYMOUS_USER_UUID } from "@/services/user";
import UserIcon from "@/components/layout/UserIcon";
import { useDisableBrowserShortcuts } from "@/hooks/useDisableBrowserShortcuts";
import { useMacAppMenu } from "@/hooks/useMacAppMenu";
import { log } from "@/utils/logger";

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh; /* 确保占满视口高度 */
`;

const AppHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  height: ${(props) => props.theme.sizing.appHeaderHeight};
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.textPrimary};
  user-select: none;
  z-index: ${(props) => props.theme.zIndices.appHeader};
`;

const HeaderLeft = styled.div`
  height: 100%;
  margin-left: ${(props) => props.theme.spacing.headerMargin};
  font-size: ${(props) => props.theme.typography.menuFontSize};
`;

const HeaderRight = styled.div`
  height: 100%;
  margin-right: ${(props) => props.theme.spacing.headerMargin};
  display: flex;
  align-items: center;
  gap: 5px; /* 用户图标与窗口控制按钮之间的间距 */
`;

const AppMain = styled.main`
  background-color: ${(props) => props.theme.colors.background};
  flex: 1;
  overflow: auto;
  margin: 0;
  min-height: 0; /* 防止内部滚动容器撑开布局 */
`;

const AppLayout: React.FC = () => {
  const location = useLocation();
  const { activeUser, switchActiveUser } = useAuth();
  const isMacOS =
    typeof navigator !== "undefined" &&
    (navigator.platform.toLowerCase().includes("mac") ||
      navigator.userAgent.toLowerCase().includes("mac"));

  useDisableBrowserShortcuts();
  useMacAppMenu();

  useEffect(() => {
    log.debug(`路由切换到 ${location.pathname}`);
  }, [location]);

  /**
   * @effect
   */
  useEffect(() => {
    const validateActiveUser = async () => {
      if (!activeUser || activeUser.uuid === ANONYMOUS_USER_UUID) {
        return;
      }

      const allDbUsers = await getAllUsers();
      const activeUserExistsInDb = allDbUsers.some(
        (user) => user.uuid === activeUser.uuid,
      );
      if (!activeUserExistsInDb) {
        log.debug(
          `活动用户 "${activeUser.username}" 在数据库中不存在，已自动切换到匿名用户`,
        );
        const anonymousUser = allDbUsers.find(
          (u) => u.uuid === ANONYMOUS_USER_UUID,
        );
        if (anonymousUser) {
          void switchActiveUser(anonymousUser);
        }
      }
    };

    void validateActiveUser();
  }, [activeUser, switchActiveUser]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      void attachConsole();
    }
  }, []);

  return (
    <AppContainer className="app-container">
      {!isMacOS && (
        <AppHeader className="app-header" data-tauri-drag-region>
          <HeaderLeft className="header-left" data-tauri-drag-region="false">
            <Menus />
          </HeaderLeft>
          <HeaderRight className="header-right" data-tauri-drag-region="false">
            <UserIcon />
            <div className="window-controls-wrapper" style={{ height: "100%" }}>
              <WindowControls />
            </div>
          </HeaderRight>
        </AppHeader>
      )}
      <AppMain className="app-main">
        <Outlet />
      </AppMain>
    </AppContainer>
  );
};

export default function App() {
  return (
    <AppProvider>
      <GlobalStyle />
      <AppEventManager />
      <AppLayout />
    </AppProvider>
  );
}
