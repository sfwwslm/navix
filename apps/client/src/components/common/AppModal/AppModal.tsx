import React from "react";
import { Overlay } from "@/components/styled/StyledModal";
import { IoCloseSharp } from "react-icons/io5";
import {
  AppModalBody,
  AppModalCloseButton,
  AppModalContainer,
  AppModalHeader,
  AppModalTitle,
} from "./AppModal.styles";

interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

/**
 * 通用模态框容器。
 */
const AppModal: React.FC<AppModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
}) => {
  if (!isOpen) return null;

  return (
    <Overlay
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AppModalContainer
        className="modal-container"
        initial={{ y: -50, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -50, opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        onClick={(event) => event.stopPropagation()}
      >
        <AppModalHeader className="app-modal__header">
          {title && (
            <AppModalTitle className="app-modal__title">{title}</AppModalTitle>
          )}
          <AppModalCloseButton
            className="app-modal__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <IoCloseSharp />
          </AppModalCloseButton>
        </AppModalHeader>
        <AppModalBody className="app-modal__body">{children}</AppModalBody>
      </AppModalContainer>
    </Overlay>
  );
};

export default AppModal;
