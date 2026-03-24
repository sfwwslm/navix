import styled from "styled-components";
import { motion } from "framer-motion";
import { StyledButton } from "@/components/styled/StyledButton";

export const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const EngineList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 250px;
  overflow-y: auto;
`;

export const EngineListItem = styled(motion.li)<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid
    ${(props) =>
      props.$isActive ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.base};
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  background-color: ${(props) =>
    props.$isActive
      ? props.theme.colors.primaryFocus
      : props.theme.colors.background};

  &:hover {
    border-color: ${(props) => props.theme.colors.primary};
  }
`;

export const EngineIcon = styled.div`
  font-size: 1.5rem;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const EngineName = styled.span`
  flex-grow: 1;
  font-weight: 500;
`;

export const ActionButtonsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const ActionButton = styled.button`
  background: none;
  border: none;
  font-size: 1.2rem;
  padding: 0.25rem;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &.edit-btn {
    color: ${(props) => props.theme.colors.primary};
    &:hover {
      background-color: ${(props) => props.theme.colors.border};
    }
  }

  &.delete-btn {
    color: ${(props) => props.theme.colors.error};
    &:hover {
      background-color: ${(props) => props.theme.colors.border};
    }
  }
`;

export const AddEngineForm = styled.form`
  padding-top: 1.5rem;
  border-top: 1px solid ${(props) => props.theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
`;

export const FormRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

export const CompactButton = styled(StyledButton)`
  padding: 6px 12px;
  font-size: 0.8rem;
  flex-shrink: 0;
`;

export const HintText = styled.p`
  font-size: 0.8rem;
  color: ${(props) => props.theme.colors.textHint};
  margin-top: 4px;
`;

export const IconPreview = styled.div`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background-color: ${(props) => props.theme.colors.border};
  overflow: hidden;
  flex-shrink: 0;

  img,
  svg {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;
