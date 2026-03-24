import React from "react";
import styled from "styled-components";
import { useAuth } from "@/contexts/Auth.context";
import {
  IoPersonCircleOutline,
  IoSyncOutline,
  IoLogInOutline,
} from "react-icons/io5";
import { MdOutlineSwitchAccount } from "react-icons/md";
import { motion } from "framer-motion";
import { StyledButton } from "@/components/styled/StyledButton";
import { useTranslation } from "react-i18next";
import { ANONYMOUS_USER_UUID } from "@/services/user";
import { useSync } from "@/contexts";
import { startSync } from "@/services/sync";
import { useModal } from "@/contexts";
import AccountSwitcherModal from "./AccountSwitcherModal";
import LoginModal from "./LoginModal";

const CardContainer = styled(motion.div)`
  width: 280px;
  background-color: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.base};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem; /* 内部元素间距 */
`;

const ProfileSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const Avatar = styled(IoPersonCircleOutline)`
  font-size: 5rem; /* 放大头像图标 */
  color: ${(props) => props.theme.colors.primary};
`;

const Username = styled.p`
  font-size: 1.2rem;
  font-weight: 600;
  color: ${(props) => props.theme.colors.textPrimary};
  word-break: break-all; /* 防止长用户名溢出 */
`;

/** */
const UserUid = styled.p`
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.textSecondary};
  font-family: "Courier New", Courier, monospace;
`;

const ActionsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid ${(props) => props.theme.colors.border};
  padding-top: 1.5rem;
`;

interface UserProfileCardProps {
  onClose: () => void;
}

/**
 * @component UserProfileCard
 */
const UserProfileCard: React.FC<UserProfileCardProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const {
    activeUser,
    logout,
    isLoggedIn,
    incrementDataVersion,
    switchActiveUser,
    availableUsers,
    refreshAvailableUsers,
  } = useAuth();
  const { isSyncing, setIsSyncing, setSyncMessage, setSyncCompleted } =
    useSync();
  const { openModal } = useModal();
  const hasSwitchableUsers = availableUsers.some(
    (u) => u.uuid !== ANONYMOUS_USER_UUID,
  );
  /**
   * @function handleLogout
   */
  const handleLogout = () => {
    void logout(); //
    onClose(); //
  };

  /**
   * @function handleSync
   */
  const handleSync = async () => {
    if (!activeUser || isSyncing) return;
    onClose(); //
    setSyncMessage(t("sync.preparingSync")); //
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

  /**
   * @function openAccountSwitcher
   */
  const openAccountSwitcher = () => {
    onClose(); //
    openModal(
      (close) => <AccountSwitcherModal isOpen={true} onClose={close} />,
      {
        key: "account-switcher",
      },
    );
  };

  /**
   * @function openLoginModal
   */
  const openLoginModal = () => {
    onClose(); //
    openModal((close) => <LoginModal isOpen={true} onClose={close} />, {
      key: "login",
    });
  };
  const isAnonymous = activeUser?.uuid === ANONYMOUS_USER_UUID;

  return (
    <CardContainer
      className="user-profile-card"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {activeUser && (
        <ProfileSection>
          <Avatar />
          <Username>{activeUser.username}</Username>
          <UserUid>uid: {activeUser.uuid.substring(0, 5)}</UserUid>
        </ProfileSection>
      )}
      <ActionsSection>
        {isLoggedIn && !isAnonymous ? (
          <>
            <StyledButton
              variant="secondary"
              onClick={() => {
                void handleSync();
              }}
              disabled={isSyncing}
              className="sync-data-button-card"
            >
              <IoSyncOutline style={{ marginRight: "8px" }} />
              {isSyncing ? t("account.syncing") : t("account.dataSync")}
            </StyledButton>
            <StyledButton variant="secondary" onClick={openAccountSwitcher}>
              <MdOutlineSwitchAccount style={{ marginRight: "8px" }} />
              {t("account.switchAccount.title")}
            </StyledButton>
            <StyledButton variant="danger" onClick={handleLogout}>
              {t("account.logoutButton")}
            </StyledButton>
          </>
        ) : (
          <>
            <StyledButton variant="secondary" onClick={openLoginModal}>
              <IoLogInOutline style={{ marginRight: "8px" }} />
              {t("account.title")}
            </StyledButton>
            {hasSwitchableUsers && (
              <StyledButton variant="secondary" onClick={openAccountSwitcher}>
                <MdOutlineSwitchAccount style={{ marginRight: "8px" }} />
                {t("account.switchAccount.title")}
              </StyledButton>
            )}
          </>
        )}
      </ActionsSection>
    </CardContainer>
  );
};

export default UserProfileCard;
