import React from "react";
import { Overlay, Spinner, LoadingText } from "./LoadingOverlay.styles";

interface LoadingOverlayProps {
  isOpen: boolean;
  text?: string;
}

/**
 * @component LoadingOverlay
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isOpen,
  text = "正在加载...",
}) => {
  if (!isOpen) return null;

  return (
    <Overlay
      className="loading-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Spinner className="loading-spinner" />
      <LoadingText className="loading-text">{text}</LoadingText>
    </Overlay>
  );
};

export default LoadingOverlay;
