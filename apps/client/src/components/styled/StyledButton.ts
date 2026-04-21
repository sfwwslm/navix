import styled, { css } from "styled-components";
import { motion } from "framer-motion";
import { Theme } from "@/styles/themes";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

/** 基础样式，只包含所有按钮真正通用的属性 */
const baseButtonStyles = css<{ theme: Theme }>`
  font-weight: bold;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  border: 1px solid transparent;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    filter: none;
  }
`;

/** 不同变体的具体样式 */
const variants = {
  // 主要、次要、危险按钮样式（更突出）
  primary: css`
    padding: calc(${(props) => props.theme.spacing.unit} * 1.2)
      calc(${(props) => props.theme.spacing.unit} * 2.5);
    border-radius: ${(props) => props.theme.radii.base};
    font-size: 0.95rem;
    gap: calc(${(props) => props.theme.spacing.unit} / 2);
    background-color: ${(props) => props.theme.colors.primary};
    color: ${(props) => props.theme.colors.background};
    &:hover {
      transform: translateY(-2px);
      filter: brightness(1.1);
      box-shadow: 0 5px 15px ${(props) => props.theme.colors.primaryFocus};
    }
  `,
  secondary: css`
    padding: calc(${(props) => props.theme.spacing.unit} * 1.2)
      calc(${(props) => props.theme.spacing.unit} * 2.5);
    border-radius: ${(props) => props.theme.radii.base};
    font-size: 0.95rem;
    gap: calc(${(props) => props.theme.spacing.unit} / 2);
    background-color: ${(props) => props.theme.colors.secondary};
    color: ${(props) => props.theme.colors.textPrimary};
    &:hover {
      transform: translateY(-2px);
      filter: brightness(1.1);
      box-shadow: 0 3px 10px
        ${(props) => props.theme.colors.secondaryTransparent};
    }
  `,
  danger: css`
    padding: calc(${(props) => props.theme.spacing.unit} * 1.2)
      calc(${(props) => props.theme.spacing.unit} * 2.5);
    border-radius: ${(props) => props.theme.radii.base};
    font-size: 0.95rem;
    gap: calc(${(props) => props.theme.spacing.unit} / 2);
    background-color: ${(props) => props.theme.colors.error};
    color: white;
    &:hover {
      transform: translateY(-2px);
      filter: brightness(1.1);
      box-shadow: 0 3px 10px rgba(244, 67, 54, 0.4);
    }
  `,
  // Ghost 变体，精确复现 TextActionButton 的样式
  ghost: css`
    background-color: transparent;
    color: ${(props) => props.theme.colors.primary};
    border: 1px solid ${(props) => props.theme.colors.border};
    padding: 6px 12px;
    border-radius: 5px;
    font-size: 0.8rem;
    gap: 8px;

    &:hover {
      border-color: ${(props) => props.theme.colors.primary};
      color: ${(props) => props.theme.colors.primary}; /* 悬停时保持颜色 */
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      filter: none; /* 移除基础样式中的 filter */
    }
  `,
};

export const StyledButton = styled(motion.button)<{
  theme: Theme;
  variant?: ButtonVariant;
}>`
  ${baseButtonStyles}
  ${({ variant = "primary" }) => variants[variant]}
`;
