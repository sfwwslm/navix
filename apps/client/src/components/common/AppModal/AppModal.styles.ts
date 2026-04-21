import styled from "styled-components";
import {
  CloseButton,
  ModalContainer,
  ModalTitle,
} from "@/components/styled/StyledModal";

export const AppModalContainer = styled(ModalContainer)`
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
`;

export const AppModalHeader = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(${(props) => props.theme.spacing.unit} * 2)
    calc(${(props) => props.theme.spacing.unit} * 3);
  background: ${(props) => props.theme.colors.surface};
  flex: 0 0 auto;

  &::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      ${(props) => props.theme.colors.border},
      transparent
    );
    opacity: 0.7;
  }
`;

export const AppModalTitle = styled(ModalTitle)`
  margin: 0;
  line-height: 1.3;
`;

export const AppModalCloseButton = styled(CloseButton)`
  position: absolute;
  top: 50%;
  right: calc(${(props) => props.theme.spacing.unit} * 1);
  transform: translateY(-50%);

  &:hover {
    transform: translateY(-50%) rotate(90deg);
  }
`;

export const AppModalBody = styled.div`
  padding: calc(${(props) => props.theme.spacing.unit} * 3);
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
  box-shadow: inset 0 8px 12px -12px rgba(0, 0, 0, 0.25);
`;
