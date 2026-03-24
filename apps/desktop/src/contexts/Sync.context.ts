import { createContext, useContext } from "react";

export interface SyncContextType {
  isSyncing: boolean;
  syncMessage: string;
  syncCompleted: boolean;
  setIsSyncing: (isSyncing: boolean) => void;
  setSyncMessage: (message: string) => void;
  setSyncCompleted: (completed: boolean) => void;
  resetSyncState: () => void;
}

export const SyncContext = createContext<SyncContextType | undefined>(
  undefined,
);

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
};
