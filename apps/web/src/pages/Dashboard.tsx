import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getUserAccessToken } from "../auth/tokenStore";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useI18n } from "../i18n/useI18n";

/**
 * 兼容旧路径的仪表盘页面，直接跳转到导航页
 */
const DashboardPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { loading } = useCurrentUser({ redirectTo: "/login" });

  useEffect(() => {
    const token = getUserAccessToken();
    if (!token) {
      void navigate("/login");
      return;
    }
    if (loading) return;
    void navigate("/launchpad", { replace: true });
  }, [navigate, loading]);

  if (loading) {
    return (
      <div data-page="dashboard" data-ui="dashboard-redirecting">
        {t("dashboard.redirecting")}
      </div>
    );
  }
  return <Navigate to="/launchpad" replace />;
};

export default DashboardPage;
