import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ApiRequestError, apiFetchRaw } from "../api";
import { apiFetch } from "../api";
import { setCurrentUserSession } from "../auth/tokenStore";
import AuthLayout from "../components/AuthLayout";
import { useI18n } from "../i18n/useI18n";
import { log } from "../utils/logger";

type AuthTokenResponse = {
  access_token: string;
  token_type: string;
  refresh_token: string;
};

type BootstrapStatusResponse = {
  initialized: boolean;
};

/**
 * 渲染登录页面，负责初始化状态检查、管理员初始化和显式登录流程。
 */
const LoginPage = () => {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [initialized, setInitialized] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { message?: unknown } | null;
  const notification =
    typeof locationState?.message === "string" ? locationState.message : null;

  useEffect(() => {
    let active = true;

    /**
     * 读取初始化状态，决定当前页面展示首次初始化还是普通登录表单。
     */
    const fetchBootstrapStatus = async () => {
      setBootstrapLoading(true);
      setError(null);
      try {
        const resp = await apiFetch<BootstrapStatusResponse>(
          "/api/bootstrap/status",
        );
        if (!active) {
          return;
        }
        setInitialized(resp.data?.initialized ?? true);
      } catch (err) {
        log.error("运行期错误", err);
        if (!active) {
          return;
        }
        const isNetworkFailure =
          !window.navigator.onLine || err instanceof TypeError;
        setError(
          t(
            isNetworkFailure
              ? "auth.bootstrapStatusNetworkFailed"
              : "auth.bootstrapStatusFailed",
          ),
        );
      } finally {
        if (active) {
          setBootstrapLoading(false);
        }
      }
    };

    void fetchBootstrapStatus();
    return () => {
      active = false;
    };
  }, [t]);

  /**
   * 提交登录表单并按角色跳转到对应页面。
   * @param event React 表单提交事件
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      if (!initialized) {
        await apiFetch<null>("/api/bootstrap/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        setInitialized(true);
        void navigate("/login", {
          replace: true,
          state: { message: t("auth.bootstrapSuccess") },
        });
        return;
      }

      const data = await apiFetchRaw<AuthTokenResponse>("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (data.access_token) {
        setCurrentUserSession(data.access_token, data.refresh_token);
        void navigate("/launchpad");
      } else {
        setError(t("auth.invalidCredential"));
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message || t("auth.loginFailed"));
      } else {
        setError(t("auth.requestFailed"));
      }
      log.error("运行期错误", err);
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    void handleSubmit(event);
  };

  /**
   * 根据系统初始化状态切换登录页标题和提交按钮文案。
   */
  const cardTitle = initialized
    ? t("auth.loginTitle")
    : t("auth.bootstrapTitle");
  const cardDescription = initialized ? t("auth.loginDescription") : "";
  const submitLabel = initialized
    ? t("auth.loginButton")
    : t("auth.bootstrapButton");

  return (
    <>
      <a
        className="login-github-link"
        data-ui="login-github-link"
        href="https://github.com/guowenju/navix"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("auth.githubRepository")}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M12 .297C5.37.297 0 5.67 0 12.297c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.043-1.61-4.043-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.838 1.237 1.838 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.334-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 0 1 3-.405c1.02.005 2.045.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      </a>
      <AuthLayout
        pageName="login"
        cardTitle={cardTitle}
        cardDescription={cardDescription}
      >
        {notification && (
          <div className="message success" data-ui="login-notification">
            {notification}
          </div>
        )}

        <form
          onSubmit={handleFormSubmit}
          className="auth-form"
          data-ui="login-form"
          style={{
            marginTop: notification ? "1rem" : "0",
          }}
        >
          <div className="form-group" data-slot="login-username-group">
            <label htmlFor="username">{t("auth.username")}</label>
            <input
              type="text"
              id="username"
              className="form-input"
              data-ui="login-username-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={bootstrapLoading}
              required
            />
          </div>
          <div className="form-group" data-slot="login-password-group">
            <label htmlFor="password">{t("auth.password")}</label>
            <input
              type="password"
              id="password"
              className="form-input"
              data-ui="login-password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={bootstrapLoading}
              required
            />
          </div>
          <button
            type="submit"
            className="form-button"
            data-ui="login-submit-button"
            disabled={bootstrapLoading}
          >
            {submitLabel}
          </button>
        </form>

        {error && (
          <div className="message error" data-ui="login-error">
            {error}
          </div>
        )}
      </AuthLayout>
    </>
  );
};

export default LoginPage;
