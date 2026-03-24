import styled from "styled-components";
import { motion } from "framer-motion";
import { Theme } from "@/styles/themes";

/**
 * @const Overlay
 * @description 模态框背景遮罩层样式
 */
export const Overlay = styled(motion.div)<{ theme: Theme; zIndex?: number }>`
  position: fixed;
  top: ${(props) => props.theme.sizing.appHeaderHeight};
  left: 0;
  right: 0;
  bottom: 0;
  background: ${(props) => props.theme.colors.overlayBackground};
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: ${(props) => props.zIndex || props.theme.zIndices.loginModal};
  backdrop-filter: blur(5px);
`;

/**
 * @const ModalContainer
 * @description 模态框内容容器样式
 */
export const ModalContainer = styled(motion.div)<{ theme: Theme }>`
  background: ${(props) => props.theme.colors.surface};
  border-radius: ${(props) => props.theme.radii.base};
  padding: calc(${(props) => props.theme.spacing.unit} * 3);
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border: 1px solid ${(props) => props.theme.colors.border};
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
`;

/**
 * @const CloseButton
 * @description 模态框关闭按钮样式
 */
export const CloseButton = styled.button<{ theme: Theme }>`
  position: absolute;
  top: calc(${(props) => props.theme.spacing.unit} * 1);
  right: calc(${(props) => props.theme.spacing.unit} * 1);
  background: none;
  border: none;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: 1.5rem;
  cursor: pointer;
  padding: ${(props) => props.theme.spacing.unit};
  border-radius: 50%;
  transition: all 0.3s ease;

  &:hover {
    color: ${(props) => props.theme.colors.primary};
    background-color: rgba(${(props) => props.theme.colors.primary}, 0.1);
    transform: rotate(90deg);
  }
`;

/**
 * @const ModalTitle
 * @description 模态框标题样式
 */
export const ModalTitle = styled.h2<{ theme: Theme }>`
  color: ${(props) => props.theme.colors.primary};
  margin-bottom: calc(${(props) => props.theme.spacing.unit} * 2);
  text-align: center;
  font-size: 1.5rem;
  letter-spacing: 1px;
`;
