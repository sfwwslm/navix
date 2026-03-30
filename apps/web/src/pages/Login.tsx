import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ApiRequestError, apiFetchRaw } from "../api";
import { apiFetch } from "../api";
import {
  clearInvalidUserSession,
  getUserRefreshToken,
  setCurrentUserSession,
} from "../auth/tokenStore";
import AuthLayout from "../components/AuthLayout";
import { useI18n } from "../i18n/useI18n";

type AuthTokenResponse = {
  access_token: string;
  token_type: string;
  refresh_token: string;
};

type BootstrapStatusResponse = {
  initialized: boolean;
};

/**
 * 登录页面组件
 */
const LoginPage = () => {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [initialized, setInitialized] = useState(true);
  const [restoringSession, setRestoringSession] = useState(() =>
    Boolean(getUserRefreshToken()),
  );

  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { message?: unknown } | null;
  const notification =
    typeof locationState?.message === "string" ? locationState.message : null;

  useEffect(() => {
    let active = true;

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
        console.error(err);
        if (!active) {
          return;
        }
        setError(t("auth.bootstrapStatusFailed"));
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

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const refreshToken = getUserRefreshToken();
      if (!refreshToken) {
        if (active) {
          setRestoringSession(false);
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
          void navigate("/launchpad", { replace: true });
          return;
        }

        clearInvalidUserSession();
      } catch {
        clearInvalidUserSession();
      } finally {
        if (active) {
          setRestoringSession(false);
        }
      }
    };

    void restoreSession();
    return () => {
      active = false;
    };
  }, [navigate]);

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
      console.error(err);
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    void handleSubmit(event);
  };

  const cardTitle = bootstrapLoading
    ? t("common.loading")
    : initialized
      ? t("auth.loginTitle")
      : t("auth.bootstrapTitle");
  const cardDescription = initialized ? t("auth.loginDescription") : "";
  const submitLabel = initialized
    ? t("auth.loginButton")
    : t("auth.bootstrapButton");

  if (restoringSession) {
    return (
      <AuthLayout
        pageName="login"
        cardTitle={cardTitle}
        cardDescription={cardDescription}
      >
        <div className="message info" data-ui="login-verifying">
          {t("auth.verifying")}
        </div>
      </AuthLayout>
    );
  }

  return (
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
  );
};

export default LoginPage;
