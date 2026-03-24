import styled from "styled-components";
import { ModalContainer, ModalTitle } from "@/components/styled/StyledModal";
import { StyledButton } from "@/components/styled/StyledButton";
import { Theme } from "@/styles/themes";

export const ConfirmationModalContainer = styled(ModalContainer)`
  max-width: 400px;
  text-align: center;
`;

export const ConfirmationTitle = styled(ModalTitle)<{ theme: Theme }>`
  font-size: 1.6rem;
  color: ${(props) => props.theme.colors.warning};
`;

export const ConfirmationMessage = styled.p<{ theme: Theme }>`
  font-size: 1.1rem;
  color: ${(props) => props.theme.colors.textSecondary};
  margin-bottom: calc(${(props) => props.theme.spacing.unit} * 4);
  line-height: 1.5;
`;

export const ButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  gap: calc(${(props) => props.theme.spacing.unit} * 2);
  margin-top: calc(${(props) => props.theme.spacing.unit} * 3);
`;

export const ConfirmButton = styled(StyledButton).attrs({ variant: "danger" })`
  padding: calc(${(props) => props.theme.spacing.unit} * 1.2)
    calc(${(props) => props.theme.spacing.unit} * 2.5);
  border-radius: ${(props) => props.theme.radii.base};
  gap: calc(${(props) => props.theme.spacing.unit} / 2);
  min-width: 100px;
  font-size: 0.95rem;
`;

export const CancelButton = styled(StyledButton).attrs({ variant: "ghost" })`
  background-color: ${(props) => props.theme.colors.border};
  padding: calc(${(props) => props.theme.spacing.unit} * 1.2)
    calc(${(props) => props.theme.spacing.unit} * 2.5);
  border-radius: ${(props) => props.theme.radii.base};
  gap: calc(${(props) => props.theme.spacing.unit} / 2);
  min-width: 100px;
  font-size: 0.95rem;
`;
