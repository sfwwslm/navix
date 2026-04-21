import styled, { css } from "styled-components";
import { Theme } from "@/styles/themes";

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: calc(${(props) => props.theme.spacing.unit} / 2);
`;

export const Label = styled.label<{ theme: Theme }>`
  font-weight: bold;
  font-size: 0.9rem;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const inputStyles = css<{ theme: Theme }>`
  width: 100%;
  padding: ${(props) => props.theme.spacing.unit};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.base};
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSizeBase};
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;
  height: calc(${(props) => props.theme.spacing.unit} * 5);
  box-sizing: border-box;

  &:focus {
    border-color: ${(props) => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${(props) => props.theme.colors.primaryFocus};
    outline: none;
  }

  /* 全局隐藏所有 number 类型输入框的步进按钮 */
  &[type="number"] {
    -moz-appearance: textfield; /* Firefox */
  }

  &[type="number"]::-webkit-inner-spin-button,
  &[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

export const Input = styled.input<{ theme: Theme }>`
  ${inputStyles}
`;

export const Textarea = styled.textarea<{ theme: Theme }>`
  ${inputStyles}
  min-height: 80px;
  resize: vertical;
`;
