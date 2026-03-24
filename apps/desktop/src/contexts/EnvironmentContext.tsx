import { ReactNode, useState, useEffect } from "react";
import {
  getlaunchpadEnvironment,
  setlaunchpadEnvironment,
  Environment,
} from "@/utils/config";
import { EnvironmentContext } from "./Environment.context";

export const EnvironmentProvider = ({ children }: { children: ReactNode }) => {
  const [environment, setEnvironment] = useState<Environment>("lan");

  // 在组件挂载时从配置文件异步加载初始状态
  useEffect(() => {
    const loadEnvironment = async () => {
      const savedEnv = await getlaunchpadEnvironment();
      setEnvironment(savedEnv);
    };
    void loadEnvironment();
  }, []);

  const toggleEnvironment = () => {
    const newEnv = environment === "lan" ? "wan" : "lan";
    setEnvironment(newEnv); // 立即更新 UI 状态
    void setlaunchpadEnvironment(newEnv); // 将新状态写入配置文件
  };

  return (
    <EnvironmentContext.Provider value={{ environment, toggleEnvironment }}>
      {children}
    </EnvironmentContext.Provider>
  );
};
