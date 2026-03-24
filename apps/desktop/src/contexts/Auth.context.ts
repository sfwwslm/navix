import { createContext, useContext } from "react";
import { User } from "@/services/user";

/**
 * 解析 JWT payload 并返回标准化 `Claims`。
 * 解析失败时返回 `null`，由调用方决定后续处理策略。
 */
export interface Claims {
  sub: string;
  username: string;
  iss: string;
  exp: number;
}

/**
 * @interface AuthContextType
 * @description 定义了 AuthContext 的数据结构和可供消费的 API。
 * 这个 Context 是整个应用中用户认证和状态管理的核心。
 */
export interface AuthContextType {
  activeUser: User | null;
  availableUsers: User[];
  isLoggedIn: boolean;
  login: (
    username: string,
    password: string,
    address: string,
    useHttps: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  logoutUser: (uuid: string) => Promise<void>;
  switchActiveUser: (user: User) => void;
  dataVersion: number;
  incrementDataVersion: () => void;
  isDataOperationInProgress: boolean;
  setDataOperationInProgress: (inProgress: boolean) => void;
  refreshAvailableUsers: () => Promise<User[]>;
  updateServerAddress: (newAddress: string) => Promise<void>;
  deleteUser: (uuid: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth 必须在 AuthProvider 中使用");
  }
  return context;
};
