import { AppThemeProvider } from "./ThemeContext";
import { EnvironmentProvider } from "./EnvironmentContext";
import { ModalProvider } from "./ModalContext";
import { AuthProvider } from "./AuthContext";
import { SyncProvider } from "./SyncContext";
import { ReactNode } from "react";

export const AppProvider = ({ children }: { children: ReactNode }) => (
  <AppThemeProvider>
    <AuthProvider>
      <EnvironmentProvider>
        <SyncProvider>
          <ModalProvider>{children}</ModalProvider>
        </SyncProvider>
      </EnvironmentProvider>
    </AuthProvider>
  </AppThemeProvider>
);
