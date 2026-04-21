import React, { ReactNode } from "react";
import {
  ConfirmationModalContainer,
  ConfirmationTitle,
  ConfirmationMessage,
  ButtonGroup,
  ConfirmButton,
  CancelButton,
} from "./ConfirmationModal.styles";
import { IoAlertCircleOutline } from "react-icons/io5";
import { Overlay } from "@/components/styled/StyledModal";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";

type ModalText = ReactNode | ((t: TFunction) => ReactNode);

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: ModalText;
  message: ModalText;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: ModalText;
  cancelText?: ModalText;
  hideConfirm?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  hideConfirm = false,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const finalConfirmText = confirmText ?? t("button.confirm");
  const finalCancelText = cancelText ?? t("button.cancel");
  const resolvedConfirmText =
    typeof finalConfirmText === "function"
      ? finalConfirmText(t)
      : finalConfirmText;
  const resolvedCancelText =
    typeof finalCancelText === "function"
      ? finalCancelText(t)
      : finalCancelText;
  const resolvedTitle = typeof title === "function" ? title(t) : title;
  const resolvedMessage = typeof message === "function" ? message(t) : message;

  return (
    <Overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onCancel}
    >
      <ConfirmationModalContainer
        initial={{ y: -50, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -50, opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <ConfirmationTitle>
          <IoAlertCircleOutline
            style={{ verticalAlign: "middle", marginRight: "8px" }}
            size={30}
          />
          {resolvedTitle}
        </ConfirmationTitle>
        <ConfirmationMessage>{resolvedMessage}</ConfirmationMessage>
        <ButtonGroup>
          {!hideConfirm && (
            <ConfirmButton onClick={onConfirm}>
              {resolvedConfirmText}
            </ConfirmButton>
          )}
          <CancelButton onClick={onCancel}>{resolvedCancelText}</CancelButton>
        </ButtonGroup>
      </ConfirmationModalContainer>
    </Overlay>
  );
};

export default ConfirmationModal;
