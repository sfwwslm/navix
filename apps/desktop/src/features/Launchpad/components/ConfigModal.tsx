import React, { useState, useEffect, useCallback } from "react";

import { WebsiteGroup } from "@/features/Launchpad/types";
import * as launchpadDb from "@/services/launchpadDb";
import Loading from "@/components/common/Loading";
import GroupModal from "@/features/Launchpad/components/GroupModal";
import {
  IoAddCircleOutline,
  IoPencil,
  IoTrash,
  IoCloseSharp,
  IoCloudUploadOutline,
  IoReorderTwoOutline,
} from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { AnimatePresence } from "framer-motion";
import {
  SettingsOverlay,
  SettingsModalContainer,
  Sidebar,
  Content,
  MenuList,
  MenuItem,
  CloseButton,
  Title,
  ModalHeader,
  MainContentWrapper,
} from "@/components/layout/SettingsLayout.styles";
import {
  VscGroupByRefType,
  VscSettings,
  VscBrowser,
  VscPaintcan,
} from "react-icons/vsc";
import { useModal } from "@/contexts";
import { useAuth } from "@/contexts/Auth.context";
import { open } from "@tauri-apps/plugin-dialog";
import LoadingOverlay from "@/components/common/LoadingOverlay/LoadingOverlay";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import BrowserSettings from "@/features/Settings/BrowserSettings";
import { callTauri } from "@/services/tauri";
import {
  ActionButton,
  ActionButtons,
  AddButton,
  GroupList,
  GroupListItem,
  GroupManagementContainer,
  GroupName,
  DragHandle,
  Toolbar,
  BookmarkImportContainer,
  ImportButton,
} from "./ConfigModal.styles";
import LaunchpadPersonalizationSettings from "./LaunchpadPersonalizationSettings";

/**
 * @interface BookmarkItem
 */
interface BookmarkItem {
  title: string;
  url: string;
}

/**
 * @interface BookmarkGroup
 */
interface BookmarkGroup {
  name: string;
  items: BookmarkItem[];
}
const SortableGroupItem: React.FC<{
  group: WebsiteGroup;
  onEdit: (group: WebsiteGroup) => void;
  onDelete: (uuid: string, name: string) => void;
}> = ({ group, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.uuid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <GroupListItem ref={setNodeRef} style={style} $isDragging={isDragging}>
      <ActionButtons>
        <DragHandle {...attributes} {...listeners}>
          <IoReorderTwoOutline />
        </DragHandle>
        <GroupName>{group.name}</GroupName>
      </ActionButtons>
      <ActionButtons>
        <ActionButton className="edit-btn" onClick={() => onEdit(group)}>
          <IoPencil />
        </ActionButton>
        <ActionButton
          className="delete-btn"
          onClick={() => onDelete(group.uuid, group.name)}
        >
          <IoTrash />
        </ActionButton>
      </ActionButtons>
    </GroupListItem>
  );
};

interface NavigationConfigModalProps {
  isOpen: boolean;
  onClose: (refresh?: boolean) => void;
}

/** */
type MenuKey =
  | "group_management"
  | "bookmark_import"
  | "browser_settings"
  | "personalization";

/**
 * @component ConfigModal
 */
const ConfigModal: React.FC<NavigationConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const { openAlert, openConfirm } = useModal();
  const { activeUser } = useAuth(); //

  const [activeMenu, setActiveMenu] = useState<MenuKey>("group_management");
  const [dataChanged, setDataChanged] = useState(false);
  const [groups, setGroups] = useState<WebsiteGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WebsiteGroup | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  /**
   * @function loadGroups
   */
  const loadGroups = useCallback(async () => {
    if (!activeUser?.uuid) return; //
    setIsLoading(true);
    const { groups: data } = await launchpadDb.getLaunchpadData(
      activeUser.uuid,
    );
    setGroups(data);
    setIsLoading(false);
  }, [activeUser]); //
  useEffect(() => {
    if (isOpen) {
      void Promise.resolve().then(() => {
        void loadGroups();
        setActiveMenu("group_management"); //
      });
    }
  }, [isOpen, loadGroups]);

  /**
   * @function handleCloseOperation
   */
  const handleCloseOperation = () => {
    onClose(dataChanged);
    setDataChanged(false); //
  };

  /**
   * @function handleAddGroup
   */
  const handleAddGroup = () => {
    setEditingGroup(null);
    setIsGroupModalOpen(true);
  };

  /**
   * @function handleEditGroup
   */
  const handleEditGroup = (group: WebsiteGroup) => {
    setEditingGroup(group);
    setIsGroupModalOpen(true);
  };

  /**
   * @function handleConfirmDelete
   */
  const handleConfirmDelete = useCallback(
    async (groupUuid: string) => {
      await launchpadDb.deleteGroup(groupUuid);
      await loadGroups();
      setDataChanged(true);
    },
    [loadGroups],
  );

  /**
   * @function handleDeleteGroup
   */
  const handleDeleteGroup = (uuid: string, name: string) => {
    openConfirm({
      title: t("launchpad.deleteGroupTitle"),
      message: `${t("launchpad.deleteGroupMessagePrefix")}"${name}"${t(
        "launchpad.deleteGroupMessageSuffix",
      )}`,
      onConfirm: () => {
        void handleConfirmDelete(uuid);
      },
    });
  };
  /**
   * @function handleSaveGroup
   */
  const handleSaveGroup = useCallback(
    async (groupData: Partial<Omit<WebsiteGroup, "items" | "user_uuid">>) => {
      if (!activeUser?.uuid) {
        openAlert({ title: "错误", message: "无法确定当前用户。" });
        return;
      }

      const isNameDuplicate = groups.some(
        (g) => g.name === groupData.name && g.uuid !== groupData.uuid,
      );

      if (isNameDuplicate) {
        openAlert({
          title: "保存失败",
          message: "分组名称已存在，请使用其他名称。",
        });
        return;
      }

      const dataToSave: Partial<WebsiteGroup> = { ...groupData };
      if (!dataToSave.uuid) {
        dataToSave.sort_order = groups.length;
        dataToSave.user_uuid = activeUser.uuid;
      }

      await launchpadDb.saveGroup(dataToSave);
      await loadGroups(); //
      setIsGroupModalOpen(false);
      setDataChanged(true);
    },
    [groups, loadGroups, openAlert, activeUser],
  );

  /**
   * @function handleImportBookmarks
   */
  const handleImportBookmarks = async () => {
    if (!activeUser?.uuid) return;
    try {
      const selectedPath = await open({
        multiple: false,
        filters: [{ name: "HTML", extensions: ["html"] }],
      });

      if (typeof selectedPath === "string") {
        setIsImporting(true);
        const importedGroups: BookmarkGroup[] = await callTauri(
          "bookmark_parser",
          {
            path: selectedPath,
          },
        );

        if (
          importedGroups.length === 0 ||
          importedGroups[0].items.length === 0
        ) {
          setIsImporting(false);
          openAlert({
            title: t("launchpad.importErrorTitle"),
            message: "未在文件中找到有效书签。",
          });
          return;
        }

        let newGroupCount = 0;
        let newItemCount = 0;
        const existingGroupNames = new Set(groups.map((g) => g.name));

        for (const importedGroup of importedGroups) {
          if (!existingGroupNames.has(importedGroup.name)) {
            await launchpadDb.saveGroup({
              name: importedGroup.name,
              user_uuid: activeUser.uuid,
            });
            newGroupCount++;
          }
        }
        const { groups: updatedGroups } = await launchpadDb.getLaunchpadData(
          activeUser.uuid,
        );
        for (const importedGroup of importedGroups) {
          const targetGroup = updatedGroups.find(
            (g) => g.name === importedGroup.name,
          );
          if (targetGroup) {
            for (const item of importedGroup.items) {
              await launchpadDb.saveItem({
                group_uuid: targetGroup.uuid,
                user_uuid: activeUser.uuid,
                title: item.title,
                url: item.url,
                default_icon: "ion:globe-outline",
              });
              newItemCount++;
            }
          }
        }

        setIsImporting(false);
        setDataChanged(true);
        await loadGroups(); //

        openAlert({
          title: t("launchpad.importSuccessTitle"),
          message: t("launchpad.importSuccessMessage", {
            groupCount: newGroupCount,
            itemCount: newItemCount,
          }),
        });
      }
    } catch (err) {
      setIsImporting(false);
      openAlert({
        title: t("launchpad.importErrorTitle"),
        message: String(err),
      });
    }
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setGroups((items) => {
        const oldIndex = items.findIndex((item) => item.uuid === active.id);
        const newIndex = items.findIndex((item) => item.uuid === over.id);
        const newOrderedGroups = arrayMove(items, oldIndex, newIndex);
        void launchpadDb.updateGroupsOrder(newOrderedGroups);
        setDataChanged(true);
        return newOrderedGroups;
      });
    }
  }, []);

  /**
   * @function renderContent
   */
  const renderContent = () => {
    if (isLoading) return <Loading />;

    switch (activeMenu) {
      case "group_management":
        return (
          <GroupManagementContainer className="group-management-container">
            <Toolbar>
              <AddButton onClick={handleAddGroup}>
                <IoAddCircleOutline /> {t("launchpad.addGroup")}
              </AddButton>
            </Toolbar>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={groups.map((g) => g.uuid)}
                strategy={verticalListSortingStrategy}
              >
                <GroupList>
                  {groups.map((group) => (
                    <SortableGroupItem
                      key={group.uuid}
                      group={group}
                      onEdit={handleEditGroup}
                      onDelete={handleDeleteGroup}
                    />
                  ))}
                </GroupList>
              </SortableContext>
            </DndContext>
          </GroupManagementContainer>
        );
      case "bookmark_import":
        return (
          <BookmarkImportContainer className="bookmark-import-container">
            <ImportButton
              onClick={() => {
                void handleImportBookmarks();
              }}
            >
              <IoCloudUploadOutline />
              {t("launchpad.importButton")}
            </ImportButton>
          </BookmarkImportContainer>
        );
      case "browser_settings":
        return <BrowserSettings />;
      case "personalization":
        return <LaunchpadPersonalizationSettings />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <SettingsOverlay
          className="Launchpad-config-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCloseOperation}
        >
          <SettingsModalContainer
            className="Launchpad-config-modal-container"
            initial={{ y: -50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader>
              <Title>
                <VscSettings />
                {t("launchpad.configLong")}
              </Title>
              <CloseButton onClick={handleCloseOperation}>
                <IoCloseSharp />
              </CloseButton>
            </ModalHeader>

            <MainContentWrapper>
              <Sidebar>
                <MenuList>
                  <MenuItem
                    className="Launchpad-config-menu-item-group"
                    $isActive={activeMenu === "group_management"}
                    onClick={() => setActiveMenu("group_management")}
                  >
                    <VscGroupByRefType />
                    {t("launchpad.groupManagement")}
                  </MenuItem>
                  <MenuItem
                    className="Launchpad-config-menu-item-import"
                    $isActive={activeMenu === "bookmark_import"}
                    onClick={() => setActiveMenu("bookmark_import")}
                  >
                    <IoCloudUploadOutline />
                    {t("launchpad.bookmarkImport")}
                  </MenuItem>
                  <MenuItem
                    className="Launchpad-config-menu-item-browser"
                    $isActive={activeMenu === "browser_settings"}
                    onClick={() => setActiveMenu("browser_settings")}
                  >
                    <VscBrowser />
                    {t("launchpad.browserSettings")}
                  </MenuItem>
                  <MenuItem
                    className="Launchpad-config-menu-item-personalization"
                    $isActive={activeMenu === "personalization"}
                    onClick={() => setActiveMenu("personalization")}
                  >
                    <VscPaintcan />
                    {t("launchpad.personalization")}
                  </MenuItem>
                </MenuList>
              </Sidebar>
              <Content className="Launchpad-config-content">
                <LoadingOverlay
                  isOpen={isImporting}
                  text={t("launchpad.importing")}
                />
                {renderContent()}
              </Content>
            </MainContentWrapper>

            <GroupModal
              isOpen={isGroupModalOpen}
              onClose={() => setIsGroupModalOpen(false)}
              onSave={(data) => {
                void handleSaveGroup(data);
              }}
              group={editingGroup}
            />
          </SettingsModalContainer>
        </SettingsOverlay>
      )}
    </AnimatePresence>
  );
};

export default ConfigModal;
