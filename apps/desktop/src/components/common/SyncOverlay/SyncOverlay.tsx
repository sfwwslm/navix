import React from "react";
import {
  Overlay,
  Spinner,
  LoadingText,
} from "../LoadingOverlay/LoadingOverlay.styles";
import { useTheme } from "styled-components";
import { StyledButton } from "@/components/styled/StyledButton";

interface SyncOverlayProps {
  isOpen: boolean;
  text: string;
  completed: boolean;
  onConfirm: () => void;
}

const SyncOverlay: React.FC<SyncOverlayProps> = ({
  isOpen,
  text,
  completed,
  onConfirm,
}) => {
  const theme = useTheme();

  if (!isOpen) return null;

  return (
    <Overlay
      className="sync-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        zIndex: theme.zIndices.appHeader + 1,
        top: 0,
        background: "rgba(0,0,0,0.7)",
      }}
    >
      {!completed && <Spinner className="sync-spinner" />}
      <LoadingText className="sync-text">{text}</LoadingText>
      {completed && (
        <StyledButton
          variant="primary"
          onClick={onConfirm}
          style={{ marginTop: "20px" }}
        >
          确认
        </StyledButton>
      )}
    </Overlay>
  );
};

export default SyncOverlay;
