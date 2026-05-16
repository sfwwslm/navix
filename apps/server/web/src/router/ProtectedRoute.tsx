import { Navigate } from "react-router-dom";
import {
  clearUserAccessToken,
  decodeTokenClaims,
  getUserAccessToken,
} from "../auth/tokenStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  loginPath?: string;
  requiredRole?: string;
}

/**
 * 渲染受保护的路由内容，并在会话无效或角色不足时跳转到登录页。
 */
const ProtectedRoute = ({
  children,
  loginPath = "/login",
  requiredRole,
}: ProtectedRouteProps) => {
  const token = getUserAccessToken();
  const isLikelyJwt = !!token && token.split(".").length === 3;

  if (!isLikelyJwt) {
    clearUserAccessToken();
    return <Navigate to={loginPath} replace />;
  }

  if (requiredRole) {
    const claims = decodeTokenClaims(token);
    if (!claims?.roles?.includes(requiredRole)) {
      clearUserAccessToken();
      return <Navigate to={loginPath} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
