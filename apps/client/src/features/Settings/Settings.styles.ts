import styled from "styled-components";

export const SettingsSection = styled.div`
  margin-bottom: 2.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  color: ${(props) => props.theme.colors.textPrimary};
  font-weight: bold;
`;

export const SelectWrapper = styled.div`
  display: inline-block;
  min-width: 15rem;
  position: relative;
`;
