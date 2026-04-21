import React, { useState } from "react";
import { IoCloseSharp, IoPersonCircleOutline } from "react-icons/io5";
import { VscSettings } from "react-icons/vsc";
import {
  SettingsOverlay,
  SettingsModalContainer,
  Sidebar,
  Content,
  MenuList,
  MenuItem,
  CloseButton,
  ModalHeader,
  MainContentWrapper,
  Title,
} from "@/components/layout/SettingsLayout.styles";
import LanguageSettings from "./LanguageSettings";
import PersonalizationSettings from "./Settings";
import AuthSettings from "@/features/Auth/AuthSettings";
import { useTranslation } from "react-i18next";
type MenuKey = "general" | "account";

interface SettingsModalProps {
  initialTab?: MenuKey;
  onClose: () => void;
}
const SettingsModal: React.FC<SettingsModalProps> = ({
  initialTab = "general", //
  onClose,
}) => {
  const [activeMenu, setActiveMenu] = useState<MenuKey>(initialTab);
  const { t } = useTranslation();
  const menuItems: { key: MenuKey; label: string; icon: React.ReactNode }[] = [
    {
      key: "general",
      label: t("settingsPage.menu.settings.title"),
      icon: <VscSettings />,
    },
    {
      key: "account",
      label: t("settingsPage.menu.account.title"),
      icon: <IoPersonCircleOutline />,
    },
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case "general":
        return (
          <>
            <LanguageSettings />
            <PersonalizationSettings />
          </>
        );
      case "account":
        return <AuthSettings />;
      default:
        return null;
    }
  };

  return (
    <SettingsOverlay
      className="help-settings-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <SettingsModalContainer
        initial={{ y: -50, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -50, opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader>
          <Title className="help-settings-title">
            {t("menu.help.settings")}
          </Title>
          <CloseButton onClick={onClose}>
            <IoCloseSharp />
          </CloseButton>
        </ModalHeader>
        <MainContentWrapper>
          <Sidebar>
            <MenuList>
              {menuItems.map((item) => (
                <MenuItem
                  key={item.key}
                  $isActive={activeMenu === item.key}
                  onClick={() => setActiveMenu(item.key)}
                  className={`settings-menu-item-${item.key}`}
                >
                  {item.icon}
                  {item.label}
                </MenuItem>
              ))}
            </MenuList>
          </Sidebar>
          <Content>{renderContent()}</Content>
        </MainContentWrapper>
      </SettingsModalContainer>
    </SettingsOverlay>
  );
};

export default SettingsModal;
