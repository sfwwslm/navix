import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { WebsiteGroup } from "@/features/Launchpad/types";
import AppModal from "@/components/common/AppModal/AppModal";
import { useTranslation } from "react-i18next";
import { useModal } from "@/contexts";

const LaunchpadGroupForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  margin-bottom: 5px;
  font-weight: bold;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const Input = styled.input`
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

const Button = styled.button`
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  background-color: ${(props) => props.theme.colors.primary};
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    filter: brightness(1.1);
  }
`;

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (group: Partial<Omit<WebsiteGroup, "items">>) => void;
  group?: WebsiteGroup | null;
}

const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  onClose,
  onSave,
  group,
}) => {
  const { t } = useTranslation();
  const { openAlert } = useModal();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    void Promise.resolve().then(() => {
      if (group) {
        setName(group.name);
        setDescription(group.description || "");
      } else {
        setName("");
        setDescription("");
      }
    });
  }, [group, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      openAlert({
        title: t("common.inputError"),
        message: t("launchpad.groupNameRequired"),
        confirmText: t("button.confirm"),
      });
      return;
    }
    onSave({
      uuid: group?.uuid,
      id: group?.id, //
      name,
      description,
      sort_order: group?.sort_order,
    });
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        group ? `${t("launchpad.editGroup")}` : `${t("launchpad.addNewGroup")}`
      }
    >
      <LaunchpadGroupForm
        className="Launchpad-group-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <FormGroup>
          <Label htmlFor="group-name">{t("launchpad.groupName")}</Label>
          <Input
            id="group-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder={t("launchpad.groupPlaceholder")}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="group-description">
            {t("launchpad.groupDescription")}
          </Label>
          <Input
            id="group-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("launchpad.groupDescriptionPlaceholder")}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </FormGroup>
        <Button type="submit">{t("launchpad.addGroupSave")}</Button>
      </LaunchpadGroupForm>
    </AppModal>
  );
};

export default GroupModal;
