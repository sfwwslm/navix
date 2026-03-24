import React, { useState, useEffect, useCallback } from "react";
import { WebsiteItem, WebsiteGroup } from "@/features/Launchpad/types";
import AppModal from "@/components/common/AppModal/AppModal";
import { useTranslation } from "react-i18next";
import { useModal } from "@/contexts";
import WebsiteItemForm from "./WebsiteItemForm";
import { isValidUrl } from "@/utils";
import { useIconRefresh } from "@/contexts";

interface EditWebsiteItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<WebsiteItem>) => void;
  item: WebsiteItem | null;
  groups: WebsiteGroup[];
  targetGroupUuid?: string | null;
}

const getInitialItem = (
  item: WebsiteItem | null,
  targetGroupUuid?: string | null,
): Partial<WebsiteItem> => {
  if (item) {
    return item;
  }
  return {
    title: "",
    url: "",
    url_lan: "",
    group_uuid: targetGroupUuid || undefined,
    default_icon: "ion:globe-outline",
    local_icon_path: null,
    description: "",
    background_color: "",
  };
};

const EditWebsiteItemModal: React.FC<EditWebsiteItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  item,
  groups,
  targetGroupUuid,
}) => {
  const { t } = useTranslation();
  const { openAlert } = useModal();
  const [editedItem, setEditedItem] = useState<Partial<WebsiteItem>>(
    getInitialItem(item, targetGroupUuid),
  );
  const { triggerIconRefresh } = useIconRefresh();

  useEffect(() => {
    if (isOpen) {
      void Promise.resolve().then(() => {
        setEditedItem(getInitialItem(item, targetGroupUuid));
      });
    }
  }, [item, targetGroupUuid, isOpen]);

  const handleItemChange = useCallback(
    (field: keyof WebsiteItem, value: string | number | null | undefined) => {
      setEditedItem((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const validateItem = (
    itemToValidate: Partial<WebsiteItem>,
  ): string | null => {
    if (!itemToValidate.title?.trim()) {
      return t("launchpad.errorTitleRequired");
    }
    if (!itemToValidate.url?.trim()) {
      return t("launchpad.errorUrlRequired");
    }
    if (!isValidUrl(itemToValidate.url)) {
      return t("launchpad.errorInvalidDefaultUrl");
    }
    if (itemToValidate.url_lan && !isValidUrl(itemToValidate.url_lan)) {
      return t("launchpad.errorInvalidIntranetUrl");
    }
    if (!itemToValidate.group_uuid) {
      return t("launchpad.selectGroup");
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errorMessage = validateItem(editedItem);
    if (errorMessage) {
      openAlert({
        title: t("launchpad.errorInvalidFormat"),
        message: errorMessage,
        confirmText: t("button.confirm"),
      });
      return;
    }

    onSave(editedItem);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? t("launchpad.editItem") : t("launchpad.addItem")}
    >
      <WebsiteItemForm
        item={editedItem}
        groups={groups}
        onItemChange={handleItemChange}
        onSubmit={handleSubmit}
        onFetchSuccess={triggerIconRefresh}
      />
    </AppModal>
  );
};

export default EditWebsiteItemModal;
