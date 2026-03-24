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
 * 受保护的路由组件
 * 检查用户是否已登录，如果未登录则重定向到登录页
 * @param children - 需要保护的子组件
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
