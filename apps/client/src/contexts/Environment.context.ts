import { createContext, useContext } from "react";
import { Environment } from "@/utils/config";

export type EnvironmentContextType = {
  environment: Environment;
  toggleEnvironment: () => void;
};

export const EnvironmentContext = createContext<
  EnvironmentContextType | undefined
>(undefined);

export const useEnvironment = () => {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error(
      "useEnvironment must be used within an EnvironmentProvider",
    );
  }
  return context;
};
