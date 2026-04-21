import styled from "styled-components";

/**
 * @description 分组管理容器
 */
export const GroupManagementContainer = styled.div`
  color: ${(props) => props.theme.colors.textPrimary};
`;

/**
 * @description 书签导入功能的主容器
 */
export const BookmarkImportContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 20px;
`;

/**
 * @description 书签导入按钮
 */
export const ImportButton = styled.button`
  background-color: ${(props) => props.theme.colors.primary};
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1rem;
  font-weight: bold;

  &:hover {
    filter: brightness(1.1);
  }
`;

export const Toolbar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
`;

export const AddButton = styled.button`
  background-color: ${(props) => props.theme.colors.primary};
  color: white;
  padding: 8px 16px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const GroupList = styled.ul`
  list-style: none;
  padding: 0;
`;

export const GroupListItem = styled.li<{ $isDragging: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: ${(props) =>
    props.$isDragging
      ? props.theme.colors.primaryFocus
      : props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 5px;
  margin-bottom: 1rem;
  transition:
    background-color 0.2s ease-in-out,
    box-shadow 0.2s ease;
  box-shadow: ${(props) =>
    props.$isDragging ? "0 4px 12px rgba(0,0,0,0.2)" : "none"};
`;

export const GroupName = styled.span`
  font-weight: bold;
`;

export const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

export const ActionButton = styled.button`
  background: none;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: 1.2rem;
  border: none;
  border-radius: 50%;
  padding: 0.25rem;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;

  transition: all 0.2s;

  &.edit-btn {
    color: ${(props) => props.theme.colors.primary};
    &:hover:not(:disabled) {
      background-color: ${(props) => props.theme.colors.border};
    }
  }

  &.delete-btn {
    color: ${(props) => props.theme.colors.error};
    &:hover:not(:disabled) {
      background-color: ${(props) => props.theme.colors.border};
    }
  }

  &:disabled {
    color: ${(props) => props.theme.colors.border};
    cursor: not-allowed;
  }
`;

export const DragHandle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => props.theme.colors.textSecondary};
  cursor: grab;
  font-size: 1.5rem;
  &:hover {
    color: ${(props) => props.theme.colors.primary};
  }
`;
