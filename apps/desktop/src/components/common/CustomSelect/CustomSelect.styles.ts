import styled from "styled-components";
import { motion } from "framer-motion";
import { Theme } from "@/styles/themes";

export const SelectContainer = styled.div`
  position: relative;
  width: 100%;
  user-select: none;
`;

export const SelectedValue = styled.div<{ $isOpen: boolean; theme: Theme }>`
  display: flex;
  align-items: center;
  height: 42px;
  padding: 0 15px;
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid
    ${(props) =>
      props.$isOpen ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.base};
  cursor: pointer;
  color: ${(props) => props.theme.colors.textPrimary};
  transition:
    border-color 0.2s ease-in-out,
    box-shadow 0.2s ease-in-out;
  box-shadow: ${(props) =>
    props.$isOpen ? `0 0 0 3px ${props.theme.colors.primaryFocus}` : "none"};

  &:hover {
    border-color: ${(props) => props.theme.colors.primary};
  }
`;

export const ArrowIcon = styled.div<{ $isOpen: boolean }>`
  margin-left: auto;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid ${(props) => props.theme.colors.textPrimary};
  transition: transform 0.2s ease-in-out;
  transform: ${(props) => (props.$isOpen ? "rotate(180deg)" : "rotate(0deg)")};
`;

export const OptionsList = styled(motion.ul)<{ theme: Theme }>`
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  right: 0;
  background-color: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.base};
  list-style: none;
  padding: 5px;
  margin: 0;
  z-index: ${(props) =>
    props.theme.zIndices.dropdown}; /* 高于 LoadingOverlay */
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
`;

export const OptionItem = styled(motion.li)<{
  $isSelected: boolean;
  $isDisabled: boolean; // 接收禁用状态
  theme: Theme;
}>`
  display: flex; /* 确保内容垂直居中 */
  align-items: center; /* 确保内容垂直居中 */
  padding: 10px 15px;
  border-radius: 5px;

  /* 根据状态应用不同样式 */
  cursor: ${(props) => (props.$isDisabled ? "not-allowed" : "pointer")};
  background-color: ${(props) =>
    props.$isSelected ? props.theme.colors.primary : "transparent"};
  color: ${(props) =>
    props.$isDisabled
      ? props.theme.colors.textHint
      : props.$isSelected
        ? "white"
        : props.theme.colors.textPrimary};
  font-weight: ${(props) => (props.$isSelected ? "bold" : "normal")};

  &:hover {
    background-color: ${(props) =>
      !props.$isDisabled && !props.$isSelected && props.theme.colors.border};
  }
`;
