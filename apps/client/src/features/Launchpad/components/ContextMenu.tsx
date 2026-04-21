import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const MenuContainer = styled(motion.div)`
  position: fixed;
  background-color: ${(props) => props.theme.colors.surface};
  border: ${(props) => props.theme.borderWidths.standard} solid
    ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.small};
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  z-index: ${(props) => props.theme.zIndices.contextMenu};
  padding: 5px;
  min-width: 120px;
`;

const MenuItem = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  color: ${(props) => props.theme.colors.textPrimary};
  &:hover {
    background-color: ${(props) => props.theme.colors.primary};
    border-radius: inherit;
    color: white;
  }
`;

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();

  return (
    <MenuContainer
      className="Launchpad-card-edit-menu"
      style={{ top: y, left: x }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <MenuItem
        onClick={() => {
          onEdit();
          onClose();
        }}
      >
        {t("button.edit")}
      </MenuItem>
      <MenuItem
        onClick={() => {
          onDelete();
          onClose();
        }}
      >
        {t("button.delete")}
      </MenuItem>
    </MenuContainer>
  );
};

export default ContextMenu;
