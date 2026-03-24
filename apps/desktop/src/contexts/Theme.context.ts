import { createContext, useContext } from "react";

export type ThemeContextType = {
  toggleTheme: () => void;
  themeName: "light" | "dark";
};

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within an AppThemeProvider");
  }
  return context;
};
