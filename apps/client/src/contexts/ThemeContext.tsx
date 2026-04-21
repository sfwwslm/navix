import { ReactNode } from "react";
import useLocalStorage from "@/hooks/useLocalStorage";
import { ThemeProvider as StyledThemeProvider } from "styled-components";
import { lightTheme, darkTheme, Theme } from "@/styles/themes";
import { ThemeContext } from "./Theme.context";

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeName] = useLocalStorage<"light" | "dark">(
    "appTheme",
    "dark",
  );

  const toggleTheme = () => {
    setThemeName((prev) => (prev === "light" ? "dark" : "light"));
  };

  const theme: Theme = themeName === "light" ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ toggleTheme, themeName }}>
      <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
    </ThemeContext.Provider>
  );
};
