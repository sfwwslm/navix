import styled from "styled-components";
import { motion } from "framer-motion";
import { Theme } from "@/styles/themes";

export const SettingsOverlay = styled(motion.div)`
  position: fixed;
  top: ${(props) => props.theme.sizing.appHeaderHeight};
  left: 0;
  right: 0;
  bottom: 0;
  background: ${(props) => props.theme.colors.overlayBackground};
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: ${(props) => props.theme.zIndices.modal};
  backdrop-filter: blur(5px);
`;

export const SettingsModalContainer = styled(motion.div)<{ theme: Theme }>`
  background: ${(props) => props.theme.colors.background};
  border-radius: ${(props) => props.theme.radii.base};
  width: 90%;
  max-width: 800px;
  height: 70vh;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border: 1px solid ${(props) => props.theme.colors.border};
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const ModalHeader = styled.div<{ theme: Theme }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: calc(${(props) => props.theme.spacing.unit} * 1.5)
    calc(${(props) => props.theme.spacing.unit} * 2);
  flex-shrink: 0;
`;

export const MainContentWrapper = styled.div`
  display: flex;
  flex-grow: 1;
  overflow: hidden;
  padding: calc(${(props) => props.theme.spacing.unit} * 1.5);
  padding-top: 0;
  gap: calc(${(props) => props.theme.spacing.unit} * 1.5);
`;

export const Content = styled.div`
  flex-grow: 1;
  padding: calc(${(props) => props.theme.spacing.unit} * 3);
  overflow-y: auto;
  background: ${(props) => props.theme.colors.surface};
  border-radius: ${(props) => props.theme.radii.base};
  position: relative; // 为 LoadingOverlay 提供定位上下文
`;

export const Title = styled.h1`
  font-size: 1.1rem;
  font-weight: bold;
  color: ${(props) => props.theme.colors.textPrimary};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const CloseButton = styled.button<{ theme: Theme }>`
  background: none;
  border: none;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: 1.5rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
  z-index: ${(props) => props.theme.zIndices.tooltip};

  &:hover {
    color: ${(props) => props.theme.colors.primary};
    background-color: rgba(0, 0, 0, 0.1);
    transform: rotate(90deg);
  }
`;

export const Sidebar = styled.div<{ theme: Theme }>`
  width: 170px;
  background: ${(props) => props.theme.colors.surface};
  padding: ${(props) => props.theme.spacing.unit};
  border-radius: ${(props) => props.theme.radii.base};
  flex-shrink: 0;
  overflow-y: auto;
`;

export const MenuList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const MenuItem = styled.li<{ $isActive: boolean; theme: Theme }>`
  padding: calc(${(props) => props.theme.spacing.unit} * 1.5);
  cursor: pointer;
  border-radius: ${(props) => props.theme.radii.base};
  background-color: ${(props) =>
    props.$isActive ? props.theme.colors.primary : "transparent"};
  color: ${(props) =>
    props.$isActive ? "white" : props.theme.colors.textPrimary};
  font-weight: ${(props) => (props.$isActive ? "bold" : "normal")};
  margin-bottom: ${(props) => props.theme.spacing.unit};
  transition: all 0.2s ease-in-out;
  display: flex;
  align-items: center;
  gap: 10px;

  &:hover {
    background-color: ${(props) => props.theme.colors.primary};
    color: white;
  }
  svg {
    font-size: 1rem;
  }
`;
