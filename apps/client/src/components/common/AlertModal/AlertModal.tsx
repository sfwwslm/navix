import React from "react";
import {
  AlertModalContainer,
  AlertTitle,
  AlertMessage,
  ButtonGroup,
  OkButton,
} from "./AlertModal.styles";
import { IoInformationCircleOutline } from "react-icons/io5";
import { Overlay } from "@/components/styled/StyledModal";
import { useTheme } from "styled-components";

export interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  confirmText?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  title,
  message,
  onClose,
  confirmText = "好的",
}) => {
  const theme = useTheme();
  if (!isOpen) return null;

  return (
    <Overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
      style={{ zIndex: theme.zIndices.notification }}
    >
      <AlertModalContainer
        initial={{ y: -50, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -50, opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <AlertTitle>
          <IoInformationCircleOutline
            style={{ verticalAlign: "middle", marginRight: "8px" }}
            size={30}
          />
          {title}
        </AlertTitle>
        <AlertMessage>{message}</AlertMessage>
        <ButtonGroup>
          <OkButton className="alert-modal" onClick={onClose}>
            {confirmText}
          </OkButton>
        </ButtonGroup>
      </AlertModalContainer>
    </Overlay>
  );
};

export default AlertModal;
