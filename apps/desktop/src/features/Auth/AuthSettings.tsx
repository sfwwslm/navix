import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useAuth } from "@/contexts/Auth.context";
import { ANONYMOUS_USER_UUID } from "@/services/user";
import CustomSelect, {
  SelectOption,
} from "@/components/common/CustomSelect/CustomSelect";
import {
  Label as BaseLabel,
  Input as BaseInput,
} from "@/components/styled/StyledForm";
import { StyledButton } from "@/components/styled/StyledButton";
import DataClaim from "./DataClaim";
import LoginModal from "./LoginModal";
import { IoLogInOutline, IoSyncOutline } from "react-icons/io5";
import { useModal } from "@/contexts";
import { useSync } from "@/contexts";
import { startSync } from "@/services/sync";

const AuthContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 450px;
  margin: 0 auto;
`;

const SettingsBlock = styled.div`
  padding: 1.5rem;
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.base};
  background-color: ${(props) => props.theme.colors.background};
`;

const Label = styled(BaseLabel)`
  text-align: left;
  margin-bottom: 0.75rem;
  display: block;
`;

const UserSwitcherContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const AuthActionsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
`;

const ActionCard = styled(SettingsBlock)`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
`;

const ActionTitle = styled.div`
  font-weight: 700;
  color: ${(props) => props.theme.colors.textPrimary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ActionDesc = styled.p`
  margin: 0;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: 0.92rem;
  line-height: 1.4;
`;

const ActionButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  ${StyledButton} {
    width: 100%;
  }

  .sync-data-button {
    width: 100%;
  }
`;

const DangerCard = styled(ActionCard)`
  border-color: ${(props) => props.theme.colors.error};
  background-color: ${(props) => props.theme.colors.surface};
`;

const ServerAddressBlock = styled(SettingsBlock)`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ServerInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: nowrap;
`;

const Input = styled(BaseInput)`
  flex: 1;
  width: 100%;
  min-width: 0;
`;

const HelperText = styled.p`
  margin: 0;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: 0.9rem;
`;

const UpdateButton = styled(StyledButton)`
  white-space: nowrap;
`;

const FeedbackMessage = styled.p<{ $type: "error" | "success" }>`
  margin: 0;
  color: ${(props) =>
    props.$type === "error"
      ? props.theme.colors.error
      : props.theme.colors.success};
  font-size: 0.9rem;
`;

const AuthSettings: React.FC = () => {
  const { t } = useTranslation();
  const {
    isLoggedIn,
    logout,
    activeUser,
    switchActiveUser,
    availableUsers,
    incrementDataVersion,
    refreshAvailableUsers,
    updateServerAddress,
    deleteUser,
  } = useAuth();
  const { openModal, openConfirm, openAlert } = useModal();
  const { isSyncing, setIsSyncing, setSyncMessage, setSyncCompleted } =
    useSync(); //
  const [serverAddress, setServerAddress] = useState("");
  const [serverAddressError, setServerAddressError] = useState("");
  const [serverAddressUpdated, setServerAddressUpdated] = useState(false);
  const [isUpdatingServer, setIsUpdatingServer] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const handleUserSwitch = (uuid: string | number) => {
    const selectedUser = availableUsers.find((u) => u.uuid === uuid);
    if (selectedUser) {
      switchActiveUser(selectedUser);
    }
  };

  const handleSync = async () => {
    if (!activeUser || isSyncing) return;
    setSyncMessage(t("sync.preparingSync"));
    await startSync(activeUser, {
      setIsSyncing,
      setSyncMessage,
      setSyncCompleted,
      incrementDataVersion,
      switchActiveUser,
      refreshAvailableUsers,
      t,
    });
  };
  const userOptions: SelectOption[] = availableUsers.map((user) => ({
    value: user.uuid,
    label: `${user.username} (uid: ${user.uuid.substring(0, 5)})`,
  }));

  const canEditServerAddress =
    isLoggedIn && activeUser?.uuid !== ANONYMOUS_USER_UUID;

  useEffect(() => {
    setServerAddress(activeUser?.serverAddress || "");
    setServerAddressError("");
    setServerAddressUpdated(false);
  }, [activeUser]);

  const hasServerChanged = useMemo(() => {
    const trimmed = serverAddress.trim();
    const origin = activeUser?.serverAddress?.trim() || "";
    return trimmed !== origin;
  }, [activeUser?.serverAddress, serverAddress]);

  const handleServerAddressUpdate = async () => {
    if (!canEditServerAddress) return;
    const trimmed = serverAddress.trim();
    setServerAddressError("");
    setServerAddressUpdated(false);
    if (!/^https?:\/\//i.test(trimmed)) {
      setServerAddressError(t("account.serverAddressInvalid"));
      return;
    }
    setIsUpdatingServer(true);
    try {
      await updateServerAddress(trimmed);
      setServerAddressUpdated(true);
    } catch (error: unknown) {
      setServerAddressError(
        error instanceof Error
          ? error.message
          : t("account.unknownError") || "Update failed",
      );
    } finally {
      setIsUpdatingServer(false);
    }
  };

  const handleDeleteAccount = () => {
    if (!activeUser || !canEditServerAddress) return;
    openConfirm({
      title: t("account.deleteUserTitle"),
      message: t("account.deleteUserMessage", {
        username: activeUser.username,
      }),
      confirmText: t("account.deleteUserConfirm"),
      onConfirm: () => {
        void (async () => {
          setIsDeletingUser(true);
          try {
            await deleteUser(activeUser.uuid);
          } catch (error: unknown) {
            openAlert({
              title: t("common.operationFailed"),
              message:
                error instanceof Error
                  ? error.message
                  : t("account.deleteUserFailed"),
              confirmText: t("button.confirm"),
            });
          } finally {
            setIsDeletingUser(false);
          }
        })();
      },
    });
  };

  return (
    <>
      <AuthContainer className="auth-settings-container">
        <SettingsBlock className="user-switcher-block">
          <Label>{t("account.currentUser")}</Label>
          <UserSwitcherContainer>
            <div style={{ flexGrow: 1 }}>
              <CustomSelect
                options={userOptions}
                value={activeUser?.uuid}
                onChange={handleUserSwitch}
              />
            </div>
            {isLoggedIn && activeUser?.uuid !== ANONYMOUS_USER_UUID && (
              <StyledButton
                onClick={() => {
                  void logout();
                }}
                variant="danger"
              >
                {t("account.logoutButton")}
              </StyledButton>
            )}
          </UserSwitcherContainer>
        </SettingsBlock>

        {canEditServerAddress && (
          <ServerAddressBlock className="server-address-block">
            <Label>{t("account.serverAddressLabel")}</Label>
            <ServerInputRow>
              <Input
                value={serverAddress}
                placeholder={t("account.serverAddressPlaceholder")}
                onChange={(e) => setServerAddress(e.target.value)}
              />
              <UpdateButton
                variant="secondary"
                disabled={!hasServerChanged || isUpdatingServer}
                onClick={() => {
                  void handleServerAddressUpdate();
                }}
              >
                {isUpdatingServer
                  ? t("account.serverAddressSaving")
                  : t("account.updateServerAddress")}
              </UpdateButton>
            </ServerInputRow>
            {serverAddressError && (
              <FeedbackMessage $type="error">
                {serverAddressError}
              </FeedbackMessage>
            )}
            {!serverAddressError && serverAddressUpdated && (
              <FeedbackMessage $type="success">
                {t("account.serverAddressUpdated")}
              </FeedbackMessage>
            )}
            <HelperText>{t("account.serverAddressHint")}</HelperText>
          </ServerAddressBlock>
        )}
        <AuthActionsContainer>
          <ActionCard>
            <ActionTitle>{t("account.actions.primaryTitle")}</ActionTitle>
            <ActionDesc>{t("account.actions.primaryDesc")}</ActionDesc>
            <ActionButtons>
              <StyledButton
                onClick={() =>
                  openModal(
                    (close) => <LoginModal isOpen={true} onClose={close} />,
                    {
                      key: "login",
                    },
                  )
                }
                variant="primary"
              >
                <IoLogInOutline style={{ marginRight: "8px" }} />
                {t("account.title")}
              </StyledButton>
              {isLoggedIn && activeUser?.uuid !== ANONYMOUS_USER_UUID && (
                <>
                  <DataClaim />
                  <StyledButton
                    onClick={() => {
                      void handleSync();
                    }}
                    disabled={isSyncing}
                    variant="secondary"
                    className="sync-data-button"
                  >
                    <IoSyncOutline style={{ marginRight: "8px" }} />
                    {isSyncing ? t("account.syncing") : t("account.dataSync")}
                  </StyledButton>
                </>
              )}
            </ActionButtons>
          </ActionCard>

          {isLoggedIn && activeUser?.uuid !== ANONYMOUS_USER_UUID && (
            <DangerCard>
              <ActionTitle>{t("account.actions.dangerTitle")}</ActionTitle>
              <ActionDesc>{t("account.actions.dangerDesc")}</ActionDesc>
              <ActionButtons>
                <StyledButton
                  onClick={() => {
                    void handleDeleteAccount();
                  }}
                  disabled={isDeletingUser}
                  variant="danger"
                >
                  {isDeletingUser
                    ? t("common.loading")
                    : t("account.deleteUserButton")}
                </StyledButton>
              </ActionButtons>
            </DangerCard>
          )}
        </AuthActionsContainer>
      </AuthContainer>
    </>
  );
};

export default AuthSettings;
