import React from "react";
import { useTranslation } from "react-i18next";
import { IoPersonAddOutline } from "react-icons/io5";
import styled from "styled-components";

import { StyledButton } from "@/components/styled/StyledButton";
import { useAuth } from "@/contexts/Auth.context";
import { useModal } from "@/contexts";
import { User, ANONYMOUS_USER_UUID } from "@/services/user";
import AppModal from "@/components/common/AppModal/AppModal";
import LoginModal from "./LoginModal";

const UserList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 40vh;
  overflow-y: auto;
`;

const UserListItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  &:last-child {
    border-bottom: none;
  }
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const Username = styled.span`
  font-weight: bold;
  color: ${(props) => props.theme.colors.textPrimary};
`;

const ServerUrl = styled.span`
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const CurrentUserTag = styled.span`
  font-size: 0.8rem;
  font-weight: bold;
  color: ${(props) => props.theme.colors.primary};
`;

const ModalFooter = styled.div`
  padding-top: 1.5rem;
  border-top: 1px solid ${(props) => props.theme.colors.border};
  display: flex;
  justify-content: flex-end;
`;

interface AccountSwitcherModalProps {
  onClose: () => void;
  isOpen: boolean;
}

/**
 * @component AccountSwitcherModal
 */
const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  isOpen,
  onClose,
}) => {
  // --- Hooks ---
  const { t } = useTranslation();
  const { availableUsers, activeUser, switchActiveUser, logoutUser } =
    useAuth();
  const { openModal } = useModal();
  /**
   * @function handleSwitch
   */
  const handleSwitch = (user: User) => {
    switchActiveUser(user); //
    onClose(); //
  };

  /**
   * @function handleLogout
   */
  const handleLogout = (user: User) => {
    void logoutUser(user.uuid); //
  };

  /**
   * @function handleAddAccount
   */
  const handleAddAccount = () => {
    onClose(); //
    openModal((closeLoginModal) => (
      <LoginModal isOpen={true} onClose={closeLoginModal} />
    ));
  };
  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("account.switchAccount.title")}
    >
      <UserList>
        {availableUsers.map((user) => (
          <UserListItem key={user.uuid}>
            <UserInfo>
              <Username>{user.username}</Username>
              {user.serverAddress && (
                <ServerUrl>{user.serverAddress}</ServerUrl>
              )}
            </UserInfo>
            <Actions>
              {user.uuid === activeUser?.uuid ? (
                <CurrentUserTag>
                  {t("account.switchAccount.current")}
                </CurrentUserTag>
              ) : (
                <StyledButton
                  variant="ghost"
                  onClick={() => handleSwitch(user)}
                >
                  {t("account.switchAccount.switch")}
                </StyledButton>
              )}

              {user.uuid !== ANONYMOUS_USER_UUID &&
                user.uuid !== activeUser?.uuid && (
                  <>
                    <StyledButton
                      variant="ghost"
                      onClick={() => handleLogout(user)}
                    >
                      {t("account.logoutButton")}
                    </StyledButton>
                  </>
                )}
            </Actions>
          </UserListItem>
        ))}
      </UserList>
      <ModalFooter>
        <StyledButton variant="secondary" onClick={handleAddAccount}>
          <IoPersonAddOutline style={{ marginRight: "8px" }} />
          {t("account.switchAccount.addAccount")}
        </StyledButton>
      </ModalFooter>
    </AppModal>
  );
};

export default AccountSwitcherModal;
