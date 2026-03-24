import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/Login";
import DashboardPage from "../pages/Dashboard";
import NotFoundPage from "../pages/NotFound";
import ProtectedRoute from "./ProtectedRoute";
import LaunchpadPage from "../pages/Launchpad";
import AppShell from "../layouts/AppShell";

/**
 * 定义应用的全部路由
 */
export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute loginPath="/login">
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/settings"
          element={<Navigate to="/launchpad" replace />}
        />
        <Route path="/launchpad" element={<LaunchpadPage />} />
        <Route path="/admin" element={<Navigate to="/launchpad" replace />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
