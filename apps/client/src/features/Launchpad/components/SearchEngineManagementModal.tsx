import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { IoCheckmarkCircle, IoTrash, IoPencil } from "react-icons/io5";
import { useModal } from "@/contexts";
import * as launchpadDb from "@/services/launchpadDb";
import { SearchEngine } from "@/features/Launchpad/types";
import AppModal from "@/components/common/AppModal/AppModal";
import { Input, FormGroup, Label } from "@/components/styled/StyledForm";
import DynamicIcon from "@/components/common/DynamicIcon";
import { useAuth } from "@/contexts/Auth.context";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import LoadingOverlay from "@/components/common/LoadingOverlay/LoadingOverlay";
import { useTranslation } from "react-i18next";
import { callTauri } from "@/services/tauri";
import {
  ModalContent,
  EngineList,
  EngineListItem,
  EngineIcon,
  EngineName,
  ActionButtonsContainer,
  ActionButton,
  AddEngineForm,
  HintText,
  FormRow,
  CompactButton,
  IconPreview,
} from "./SearchEngineManagementModal.styles";

interface SearchEngineManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  engines: SearchEngine[];
  activeEngine: SearchEngine;
  onEngineChange: (engine: SearchEngine) => void;
  onEnginesUpdate: () => void;
}

const SearchEngineManagementModal: React.FC<
  SearchEngineManagementModalProps
> = ({
  isOpen,
  onClose,
  engines,
  activeEngine,
  onEngineChange,
  onEnginesUpdate,
}) => {
  const { openConfirm, openAlert } = useModal();
  const { activeUser } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [editingEngine, setEditingEngine] = useState<SearchEngine | null>(null);

  const [name, setName] = useState("");
  const [urlTemplate, setUrlTemplate] = useState("");
  const [iconPath, setIconPath] = useState<string | null>(null);
  const { t } = useTranslation();

  // 记录上次处理的 editingEngine.uuid 和 isOpen 状态
  const [prevEngineUuid, setPrevEngineUuid] = useState<string | null>(null);
  const [prevIsOpen, setPrevIsOpen] = useState(false);

  const currentEngineUuid = editingEngine?.uuid ?? null;

  if (isOpen !== prevIsOpen || currentEngineUuid !== prevEngineUuid) {
    setPrevIsOpen(isOpen);
    setPrevEngineUuid(currentEngineUuid);

    if (isOpen) {
      if (editingEngine) {
        setName(editingEngine.name);
        setUrlTemplate(editingEngine.url_template);
        setIconPath(editingEngine.local_icon_path || null);
      } else {
        setName("");
        setUrlTemplate("");
        setIconPath(null);
      }
    } else {
      // When modal closes, reset internal state and the editing engine selection
      if (editingEngine !== null) {
        setEditingEngine(null);
      }
      setName("");
      setUrlTemplate("");
      setIconPath(null);
    }
  }

  const handleEditClick = (e: React.MouseEvent, engine: SearchEngine): void => {
    e.stopPropagation();
    setEditingEngine(engine);
  };

  const handleIconUpload = async () => {
    try {
      const selectedPath = await openFileDialog({
        multiple: false,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "svg", "ico", "gif"],
          },
        ],
      });

      if (typeof selectedPath === "string") {
        setIsUploading(true);
        const savedPath: string = await callTauri("save_uploaded_icon", {
          path: selectedPath,
        });
        setIconPath(savedPath);
      }
    } catch (err) {
      openAlert({
        title: t("common.uploadFailed"),
        message: `${t("launchpad.searchEngine.invalidIconFile")}: ${String(err)}`,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !urlTemplate.trim()) {
      openAlert({
        title: t("common.inputError"),
        message: t("launchpad.searchEngine.emptyNameOrUrl"),
      });
      return;
    }
    if (!activeUser) return;

    // 增强的重复名称校验
    const isDuplicate = engines.some(
      (engine) =>
        engine.name.toLowerCase() === name.trim().toLowerCase() &&
        engine.uuid !== editingEngine?.uuid,
    );

    if (isDuplicate) {
      openAlert({
        title: t("launchpad.searchEngine.duplicateName"),
        message: t("launchpad.searchEngine.duplicateNameMessage"),
      });
      return;
    }

    try {
      await launchpadDb.saveSearchEngine({
        ...(editingEngine ? { uuid: editingEngine.uuid } : {}),
        user_uuid: activeUser.uuid,
        name: name.trim(),
        url_template: urlTemplate.trim(),
        local_icon_path: iconPath,
        default_icon: "IoSearchOutline",
      });
      onEnginesUpdate();
      setName("");
      setUrlTemplate("");
      setIconPath(null);
      setEditingEngine(null);
    } catch (error) {
      openAlert({
        title: t("common.saveFailed"),
        message: `${t("common.operationFailed")}: ${String(error)}`,
      });
    }
  };

  const handleDelete = (engine: SearchEngine) => {
    openConfirm({
      title: t("common.confirmDeletion"),
      message: t("launchpad.searchEngine.confirmDeleteSearchEngine", {
        name: engine.name,
      }),
      onConfirm: () => {
        void (async () => {
          await launchpadDb.deleteSearchEngine(engine.uuid);
          if (activeEngine.uuid === engine.uuid) {
            onEngineChange(engines[0]);
          }
          onEnginesUpdate();
        })();
      },
    });
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingEngine
          ? t("launchpad.searchEngine.editSearchEngine")
          : t("launchpad.searchEngine.manageSearchEngines")
      }
    >
      <ModalContent>
        {!editingEngine && (
          <EngineList>
            <AnimatePresence>
              {engines.map((engine) => (
                <EngineListItem
                  key={engine.uuid}
                  $isActive={activeEngine.uuid === engine.uuid}
                  onClick={() => onEngineChange(engine)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <EngineIcon>
                    <DynamicIcon
                      defaultIcon={engine.default_icon}
                      localIconPath={engine.local_icon_path}
                    />
                  </EngineIcon>
                  <EngineName>{engine.name}</EngineName>
                  {activeEngine.uuid === engine.uuid && (
                    <IoCheckmarkCircle style={{ color: "green" }} />
                  )}
                  {engine.is_deletable === 1 && (
                    <ActionButtonsContainer>
                      <ActionButton
                        className="edit-btn"
                        onClick={(e) => handleEditClick(e, engine)}
                      >
                        <IoPencil />
                      </ActionButton>
                      <ActionButton
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(engine);
                        }}
                      >
                        <IoTrash />
                      </ActionButton>
                    </ActionButtonsContainer>
                  )}
                </EngineListItem>
              ))}
            </AnimatePresence>
          </EngineList>
        )}

        <AddEngineForm
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
        >
          <LoadingOverlay isOpen={isUploading} text={t("common.uploading")} />
          <FormGroup>
            <Label htmlFor="engine-name">
              {t("launchpad.searchEngine.engineName")}
            </Label>
            <Input
              id="engine-name"
              placeholder={t("launchpad.searchEngine.exampleBing")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="url-template">
              {t("launchpad.searchEngine.urlTemplate")}
            </Label>
            <Input
              id="url-template"
              placeholder={t("launchpad.searchEngine.exampleUrl")}
              value={urlTemplate}
              onChange={(e) => setUrlTemplate(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <HintText>
              {t("launchpad.searchEngine.searchPlaceholderHint")}
            </HintText>
          </FormGroup>

          <FormRow style={{ justifyContent: "flex-end" }}>
            {iconPath && (
              <IconPreview>
                <DynamicIcon localIconPath={iconPath} />
              </IconPreview>
            )}
            <CompactButton
              type="button"
              variant="ghost"
              onClick={() => {
                void handleIconUpload();
              }}
              disabled={isUploading}
            >
              {iconPath
                ? t("common.reupload")
                : t("launchpad.searchEngine.uploadIcon")}
            </CompactButton>
            <CompactButton type="submit" variant="primary">
              {editingEngine ? t("button.save") : t("button.add")}
            </CompactButton>
            {editingEngine && (
              <CompactButton
                type="button"
                variant="secondary"
                onClick={() => setEditingEngine(null)}
              >
                {t("button.cancel")}
              </CompactButton>
            )}
          </FormRow>
        </AddEngineForm>
      </ModalContent>
    </AppModal>
  );
};

export default SearchEngineManagementModal;
