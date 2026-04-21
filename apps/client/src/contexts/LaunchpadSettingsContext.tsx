import { ReactNode } from "react";
import useLocalStorage from "@/hooks/useLocalStorage";
import { LaunchpadSettingsContext } from "./LaunchpadSettings.context";

/**
 * @component LaunchpadSettingsProvider
 */
export const LaunchpadSettingsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [sideMargin, setSideMargin] = useLocalStorage<number>(
    "LaunchpadContentSideMargin",
    5, // 默认值为 5%
  );

  return (
    <LaunchpadSettingsContext.Provider value={{ sideMargin, setSideMargin }}>
      {children}
    </LaunchpadSettingsContext.Provider>
  );
};
