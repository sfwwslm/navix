import styled from "styled-components";
import { ModalContainer, ModalTitle } from "@/components/styled/StyledModal";
import { Theme } from "@/styles/themes";

export const AlertModalContainer = styled(ModalContainer)`
  max-width: 400px;
  padding: calc(${(props) => props.theme.spacing.unit} * 3);
  text-align: center;
`;

export const AlertTitle = styled(ModalTitle)<{ theme: Theme }>`
  font-size: 1.6rem;
  margin-bottom: calc(${(props) => props.theme.spacing.unit} * 2);
  color: ${(props) =>
    props.theme.colors
      .primary}; /* 使用主色调，也可以根据需要换成警告或错误色 */
`;

export const AlertMessage = styled.p<{ theme: Theme }>`
  font-size: 1.1rem;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-bottom: calc(${(props) => props.theme.spacing.unit} * 4);
  line-height: 1.5;
`;

export const ButtonGroup = styled.div<{ theme: Theme }>`
  display: flex;
  justify-content: center;
  margin-top: calc(${(props) => props.theme.spacing.unit} * 3);
`;

export const OkButton = styled.button<{ theme: Theme }>`
  background-color: ${(props) => props.theme.colors.primary};
  color: ${(props) => props.theme.colors.background};
  padding: calc(${(props) => props.theme.spacing.unit} * 1.5)
    calc(${(props) => props.theme.spacing.unit} * 3);
  border-radius: ${(props) => props.theme.radii.base};
  font-size: 1rem;
  font-weight: bold;
  transition: all 0.3s ease;
  min-width: 100px;

  &:hover {
    filter: brightness(1.15);
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 188, 212, 0.4);
  }
`;
