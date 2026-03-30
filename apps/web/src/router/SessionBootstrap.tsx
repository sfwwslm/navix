import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { apiFetchRaw } from "../api";
import {
  clearInvalidUserSession,
  getUserRefreshToken,
  setCurrentUserSession,
} from "../auth/tokenStore";
import { useI18n } from "../i18n/useI18n";
import appShellStyles from "../layouts/AppShell.module.css";
import launchpadStyles from "../pages/Launchpad.module.css";

type AuthTokenResponse = {
  access_token: string;
  token_type: string;
  refresh_token: string;
};

/**
 * 应用冷启动时先尝试恢复会话，再决定渲染登录页还是业务路由。
 *
 * 这样可以避免浏览器重启后先看到登录页，再立刻跳转到业务页的闪屏。
 */
const SessionBootstrap = () => {
  const { t } = useI18n();
  const location = useLocation();
  // `ready` 表示冷启动鉴权判定已经结束，`restored` 表示已成功恢复旧会话。
  const [ready, setReady] = useState(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let active = true;

    /**
     * 使用本地 refresh token 恢复当前会话。
     *
     * 恢复成功后仅更新本地会话，由外层路由根据当前地址决定是否重定向。
     */
    const restoreSession = async () => {
      const refreshToken = getUserRefreshToken();
      if (!refreshToken) {
        if (active) {
          setReady(true);
        }
        return;
      }

      try {
        const data = await apiFetchRaw<AuthTokenResponse>("/api/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (data.access_token && data.refresh_token) {
          setCurrentUserSession(data.access_token, data.refresh_token);
          if (active) {
            setRestored(true);
          }
          return;
        }

        clearInvalidUserSession();
      } catch {
        clearInvalidUserSession();
      } finally {
        if (active) {
          setReady(true);
        }
      }
    };

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return (
      <div
        className={appShellStyles.shell}
        data-page="session-bootstrap"
        data-ui="session-bootstrap"
      >
        <main
          className={appShellStyles.content}
          data-slot="session-bootstrap-content"
        >
          <div
            className={appShellStyles.pageActions}
            data-slot="session-bootstrap-actions"
          >
            <div
              className={`${appShellStyles.pageActionButton} ${launchpadStyles.bootstrapActionGhost}`}
              aria-hidden="true"
            />
          </div>
          <div
            className={launchpadStyles.pageShell}
            data-ui="session-bootstrap-launchpad"
          >
            <div
              className={`${launchpadStyles.stateCard} ${launchpadStyles.bootstrapStateCard}`}
            >
              {t("auth.verifying")}
            </div>
            <div
              className={launchpadStyles.pageLayout}
              data-slot="session-bootstrap-layout"
            >
              <div className={launchpadStyles.groupList}>
                {[1, 2, 3].map((group) => (
                  <section
                    key={group}
                    className={`${launchpadStyles.groupCard} ${launchpadStyles.bootstrapGroupCard}`}
                    data-ui="session-bootstrap-group"
                  >
                    <div className={launchpadStyles.groupHeader}>
                      <div className={launchpadStyles.bootstrapGroupTitle} />
                      <div className={launchpadStyles.bootstrapGroupBadge} />
                    </div>
                    <div className={launchpadStyles.siteGrid}>
                      {[1, 2, 3, 4, 5, 6].map((site) => (
                        <article
                          key={site}
                          className={`${launchpadStyles.siteCard} ${launchpadStyles.bootstrapSiteCard}`}
                          data-ui="session-bootstrap-site"
                        >
                          <div
                            className={`${launchpadStyles.iconBubble} ${launchpadStyles.bootstrapIconBubble}`}
                          />
                          <div className={launchpadStyles.siteContent}>
                            <div
                              className={launchpadStyles.bootstrapSiteTitle}
                            />
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (
    restored &&
    (location.pathname === "/" || location.pathname === "/login")
  ) {
    // 只有落在登录入口时才需要替换到业务首页，避免打断用户刷新业务页。
    return <Navigate to="/launchpad" replace />;
  }

  return <Outlet />;
};

export default SessionBootstrap;
