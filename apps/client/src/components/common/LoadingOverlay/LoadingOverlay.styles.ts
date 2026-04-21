import styled, { keyframes } from "styled-components";
import { motion } from "framer-motion";
import { Theme } from "@/styles/themes";

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

export const Overlay = styled(motion.div)<{ theme: Theme }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: ${(props) =>
    props.theme.zIndices.loadingOverlay}; /* 确保在模态框之上 */
  backdrop-filter: blur(3px);
  border-radius: ${(props) => props.theme.radii.base};
`;

export const Spinner = styled.div<{ theme: Theme }>`
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-left-color: ${(props) => props.theme.colors.primary};
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: ${spin} 1s linear infinite;
`;

export const LoadingText = styled.p<{ theme: Theme }>`
  color: white;
  margin-top: calc(${(props) => props.theme.spacing.unit} * 2);
  font-size: 1rem;
  font-weight: bold;
`;
