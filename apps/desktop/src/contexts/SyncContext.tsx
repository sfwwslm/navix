import { useState, ReactNode, useCallback } from "react";
import SyncOverlay from "@/components/common/SyncOverlay/SyncOverlay";
import { useTranslation } from "react-i18next";
import { SyncContext } from "./Sync.context";

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(t("sync.preparingSync"));
  const [syncCompleted, setSyncCompleted] = useState(false);

  // 设置函数：用户点击确认后重置
  const resetSyncState = useCallback(() => {
    setIsSyncing(false);
    setSyncCompleted(false);
    setSyncMessage(t("sync.preparingSync"));
  }, [t]);

  return (
    <SyncContext.Provider
      value={{
        isSyncing,
        syncMessage,
        syncCompleted,
        setIsSyncing,
        setSyncMessage,
        setSyncCompleted,
        resetSyncState,
      }}
    >
      {children}
      <SyncOverlay
        isOpen={isSyncing}
        text={syncMessage}
        completed={syncCompleted}
        onConfirm={resetSyncState}
      />
    </SyncContext.Provider>
  );
};
