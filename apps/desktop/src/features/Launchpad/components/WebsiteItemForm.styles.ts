import styled from "styled-components";

export const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px 20px;
  align-items: start;
  position: relative; /* 为 LoadingOverlay 定位 */
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

export const FullWidthFormGroup = styled(FormGroup)`
  grid-column: 1 / -1;
`;

export const LabelContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
`;

export const Label = styled.label`
  font-weight: bold;
  color: ${(props) => props.theme.colors.textSecondary};
`;

export const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${(props) => props.theme.colors.textSecondary};
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    color: ${(props) => props.theme.colors.primary};
    background-color: ${(props) => props.theme.colors.border};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

export const commonInputHeight = "42px";

export const Input = styled.input`
  height: ${commonInputHeight};
  padding: 10px;
  border-radius: 5px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.textPrimary};
  &:focus {
    border-color: ${(props) => props.theme.colors.primary};
    outline: none;
  }
`;

export const IconInput = styled.input`
  flex-grow: 1; /* 让输入框填充剩余空间 */
  background-color: transparent;
  border: none;
  color: ${(props) => props.theme.colors.textPrimary};
  &:focus {
    border-color: ${(props) => props.theme.colors.primary};
    outline: none;
  }
`;

export const Textarea = styled.textarea`
  padding: 10px;
  border-radius: 5px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.textPrimary};
  min-height: 80px;
  resize: vertical;

  &:focus {
    border-color: ${(props) => props.theme.colors.primary};
    outline: none;
  }
`;

export const ColorInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border-radius: 5px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background-color: ${(props) => props.theme.colors.background};
  height: ${commonInputHeight};
  box-sizing: border-box;

  &:has(:focus-within) {
    border-color: ${(props) => props.theme.colors.primary};
  }
`;

export const ColorSwatchInput = styled.input<{ $realColor: string }>`
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 28px;
  height: 28px;
  background-color: transparent;
  border: none;
  cursor: pointer;
  flex-shrink: 0;

  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  &::-webkit-color-swatch {
    border: 1px solid ${(props) => props.theme.colors.border};
    border-radius: 4px;
    background-color: ${(props) =>
      props.$realColor || props.theme.colors.surface};
  }
`;

export const HexColorInput = styled.input`
  flex-grow: 1;
  background-color: transparent;
  border: none;
  color: ${(props) => props.theme.colors.textPrimary};
  font-family: "Courier New", Courier, monospace;
  font-size: 0.9rem;
  padding: 8px 0;
  min-width: 0;

  &:focus {
    outline: none;
  }
`;

export const IconDisplayWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-radius: 5px;
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
  height: ${commonInputHeight};
`;

export const LocalIconPreview = styled.div`
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${(props) => props.theme.colors.border};

  img,
  svg {
    width: 100%;
    height: 100%;
    object-fit: cover;
    background-color: ${(props) => props.theme.colors.background};
  }
`;

export const SaveButton = styled.button`
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  background-color: ${(props) => props.theme.colors.primary};
  color: white;
  font-weight: bold;
  grid-column: 1 / -1;
  justify-self: end;
  margin-top: 10px;

  &:hover {
    filter: brightness(1.1);
  }
`;

export const IconText = styled.div`
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: 1.6;

  .link-style {
    color: ${(props) => props.theme.colors.primary};
    text-decoration: underline;
    cursor: pointer;
    &:hover {
      filter: brightness(1.2);
    }
  }

  p {
    margin: 0 0 5px 0;
  }

  ul {
    list-style-type: disc;
    list-style-position: inside;
    padding-left: 5px;
    margin: 0;
  }

  li {
    margin-bottom: 2px;
  }

  code {
    background-color: ${(props) => props.theme.colors.border};
    color: ${(props) => props.theme.colors.textPrimary};
    padding: 2px 4px;
    border-radius: 4px;
    font-family: "Courier New", Courier, monospace;
    font-size: 0.75rem;
  }
`;

/** 用于包裹图标操作按钮的容器 */
export const IconActionButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;
