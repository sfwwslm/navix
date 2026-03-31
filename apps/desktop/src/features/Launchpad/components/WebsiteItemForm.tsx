import React, { useState, useEffect } from "react";
import { useTheme } from "styled-components";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  IoCloudDownloadOutline,
  IoRefresh,
  IoCloudUploadOutline,
} from "react-icons/io5";
import { WebsiteItem, WebsiteGroup } from "@/features/Launchpad/types";
import DynamicIcon from "@/components/common/DynamicIcon";
import { useModal } from "@/contexts";
import { log } from "@/utils/logger";
import { isValidUrl } from "@/utils";
import LoadingOverlay from "@/components/common/LoadingOverlay/LoadingOverlay";
import CustomSelect from "@/components/common/CustomSelect/CustomSelect";
import Tooltip from "@/components/common/Tooltip/Tooltip";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { callTauri } from "@/services/tauri";
import {
  Form,
  FormGroup,
  Label,
  Input,
  LabelContainer,
  ActionButton,
  IconActionButtons,
  IconDisplayWrapper,
  IconText,
  IconInput,
  LocalIconPreview,
  ColorInputWrapper,
  ColorSwatchInput,
  HexColorInput,
  FullWidthFormGroup,
  SaveButton,
  Textarea,
} from "./WebsiteItemForm.styles";

interface WebsiteItemFormProps {
  item: Partial<WebsiteItem>;
  groups: WebsiteGroup[];
  onItemChange: (
    field: keyof WebsiteItem,
    value: string | number | null | undefined,
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
  onFetchSuccess: () => void;
}

const WebsiteItemForm: React.FC<WebsiteItemFormProps> = ({
  item,
  groups,
  onItemChange,
  onSubmit,
  onFetchSuccess,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { openAlert } = useModal();
  const [isFetching, setIsFetching] = useState(false);
  const [isIconInvalid, setIsIconInvalid] = useState(false); // 跟踪图标是否无效

  // 当编辑项变化时，重置图标状态
  useEffect(() => {
    void Promise.resolve().then(() => {
      setIsIconInvalid(false);
    });
  }, [item.uuid]);

  const handleFetchMetadata = async (urlToFetch?: string) => {
    if (!urlToFetch || !isValidUrl(urlToFetch)) {
      openAlert({
        title: t("launchpad.errorInvalidFormat"),
        message: t("launchpad.errorInvalidDefaultUrl"),
        confirmText: t("button.confirm"),
      });
      return;
    }
    setIsFetching(true);
    try {
      const metadata: { title?: string; local_icon_path?: string } =
        await callTauri("fetch_website_metadata", { url: urlToFetch });
      // 只要获取到 title，就更新
      if (metadata.title) {
        onItemChange("title", metadata.title);
      }
      if (metadata.local_icon_path) {
        onItemChange("local_icon_path", metadata.local_icon_path);
        onItemChange("icon_source", "auto_fetched");
        onFetchSuccess(); // 获取图标成功后，调用回调函数刷新图标
        setIsIconInvalid(false); // 重新获取图标后重置无效状态
      }
    } catch (error) {
      log.error(`Failed to fetch metadata: ${String(error)}`);
      openAlert({
        title: t("launchpad.fetchMetaErrorTitle"),
        message: t("launchpad.fetchMetaErrorMessage"),
        confirmText: t("button.confirm"),
      });
    } finally {
      setIsFetching(false);
    }
  };

  /**
   * @function handleIconUpload
   * @description 处理用户手动上传图标的逻辑
   */
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
        setIsFetching(true);
        try {
          const newIconPath: string = await callTauri("save_uploaded_icon", {
            path: selectedPath,
          });
          onItemChange("local_icon_path", newIconPath);
          onItemChange("icon_source", "user_uploaded");
          onFetchSuccess();
          setIsIconInvalid(false);
        } catch (uploadError) {
          log.error(`Failed to upload icon: ${String(uploadError)}`);
          openAlert({
            title: "上传失败",
            message: `无法保存图标文件: ${String(uploadError)}`,
            confirmText: t("button.confirm"),
          });
        } finally {
          setIsFetching(false);
        }
      }
    } catch (e) {
      log.error(`File dialog error: ${String(e)}`);
    }
  };

  const handleResetIcon = () => {
    onItemChange("local_icon_path", null);
    onItemChange("default_icon", "ion:globe-outline");
    onItemChange("icon_source", "");
    onFetchSuccess();
  };

  const handleResetColor = () => {
    onItemChange("background_color", "");
  };

  const groupOptions = groups.map((g) => ({ value: g.uuid, label: g.name }));

  return (
    <Form className="Launchpad-item-form" onSubmit={onSubmit} noValidate>
      <LoadingOverlay isOpen={isFetching} text={t("launchpad.fetching")} />

      <FormGroup className="form-group-group_uuid">
        <Label>{t("launchpad.group")}</Label>
        <CustomSelect
          value={item.group_uuid}
          onChange={(value) => onItemChange("group_uuid", value as string)}
          options={groupOptions}
          placeholder={t("launchpad.selectGroup")}
        />
      </FormGroup>

      <FormGroup className="form-group-title">
        <Label>{t("launchpad.websiteTitle")}</Label>
        <Input
          type="text"
          value={item.title || ""}
          onChange={(e) => onItemChange("title", e.target.value)}
          required
        />
      </FormGroup>

      <FormGroup className="form-group-url">
        <LabelContainer>
          <Label>URL</Label>
          <Tooltip text={t("launchpad.fetchTooltip")}>
            <ActionButton
              className="fetch-metadata-button"
              type="button"
              onClick={() => {
                void handleFetchMetadata(item.url);
              }}
              disabled={isFetching || !item.url}
            >
              <IoCloudDownloadOutline />
            </ActionButton>
          </Tooltip>
        </LabelContainer>
        <Input
          type="text"
          value={item.url || ""}
          onChange={(e) => onItemChange("url", e.target.value)}
          required
          placeholder="https://example.com"
        />
      </FormGroup>

      <FormGroup className="form-group-url_lan">
        <LabelContainer>
          <Label>{t("launchpad.urlLanOptional")}</Label>
          <Tooltip text={t("launchpad.fetchTooltip")}>
            <ActionButton
              className="fetch-metadata-button-lan"
              type="button"
              onClick={() => {
                void handleFetchMetadata(item.url_lan);
              }}
              disabled={isFetching || !item.url_lan}
            >
              <IoCloudDownloadOutline />
            </ActionButton>
          </Tooltip>
        </LabelContainer>
        <Input
          type="text"
          value={item.url_lan || ""}
          onChange={(e) => onItemChange("url_lan", e.target.value)}
          placeholder="http://192.168.1.100"
        />
      </FormGroup>

      <FormGroup className="form-group-icon">
        <LabelContainer>
          <Label>
            {item.local_icon_path
              ? t("launchpad.iconPreview")
              : t("common.iconName")}
          </Label>
          <IconActionButtons>
            <Tooltip text={t("launchpad.tooltipUploadIcon")}>
              <ActionButton
                className="upload-icon-button"
                type="button"
                onClick={() => {
                  void handleIconUpload();
                }}
                disabled={isFetching}
              >
                <IoCloudUploadOutline />
              </ActionButton>
            </Tooltip>
            <Tooltip
              text={
                item.local_icon_path
                  ? t("launchpad.tooltipUseFallbackIcon")
                  : t("launchpad.tooltipResetIcon")
              }
            >
              <ActionButton
                className="reset-icon-button"
                type="button"
                onClick={handleResetIcon}
              >
                <IoRefresh />
              </ActionButton>
            </Tooltip>
          </IconActionButtons>
        </LabelContainer>
        {item.local_icon_path ? (
          <IconDisplayWrapper>
            <LocalIconPreview>
              <DynamicIcon
                key={item.local_icon_path}
                defaultIcon=""
                localIconPath={item.local_icon_path}
                onLoadError={() => setIsIconInvalid(true)}
              />
            </LocalIconPreview>
            <span
              style={{
                flexGrow: 1,
                fontSize: "0.8rem",
                color: theme.colors.textSecondary,
                paddingLeft: "10px",
              }}
            >
              {isIconInvalid
                ? t("launchpad.iconSource.errorIconMissing")
                : item.icon_source === "user_uploaded"
                  ? t("launchpad.iconSource.userUploaded")
                  : t("launchpad.iconSource.autoFetched")}
            </span>
          </IconDisplayWrapper>
        ) : (
          <IconDisplayWrapper>
            <LocalIconPreview>
              <DynamicIcon
                key={item.local_icon_path || item.default_icon}
                defaultIcon={item.default_icon ?? "ion:globe-outline"}
                localIconPath={item.local_icon_path}
              />
            </LocalIconPreview>
            <IconInput
              type="text"
              value={item.default_icon || ""}
              onChange={(e) => onItemChange("default_icon", e.target.value)}
              placeholder="grommet-icons:edge"
            />
          </IconDisplayWrapper>
        )}
      </FormGroup>

      <FormGroup className="form-group-background_color">
        <LabelContainer>
          <Label>{t("launchpad.backgroundColorOptional")}</Label>
          <Tooltip text={t("launchpad.resetColor")}>
            <ActionButton
              type="button"
              onClick={handleResetColor}
              className="reset-color-button"
            >
              <IoRefresh />
            </ActionButton>
          </Tooltip>
        </LabelContainer>
        <ColorInputWrapper>
          <ColorSwatchInput
            type="color"
            value={item.background_color || theme.colors.surface}
            $realColor={item.background_color || ""}
            onChange={(e) => onItemChange("background_color", e.target.value)}
          />
          <HexColorInput
            type="text"
            value={item.background_color?.toUpperCase() || ""}
            onChange={(e) => onItemChange("background_color", e.target.value)}
            placeholder={theme.colors.surface}
          />
        </ColorInputWrapper>
      </FormGroup>

      <FullWidthFormGroup className="form-group-icon">
        <IconText style={{ gridColumn: "1 / -1", marginTop: "-10px" }}>
          <p>
            <strong>
              {t("launchpad.iconTitlePart1")}
              <span
                className="link-style"
                onClick={() => {
                  void openUrl("https://icon-sets.iconify.design/");
                }}
              >
                {t("launchpad.iconifyLinkText")}
              </span>
              {t("launchpad.iconTitlePart2")}
            </strong>
          </p>
          <ul>
            <li>
              {t("launchpad.iconSource.iconifyUsage")}
              <code className="code-example">ion:globe-outline</code>
            </li>
          </ul>
        </IconText>
      </FullWidthFormGroup>

      <FullWidthFormGroup className="form-group-description">
        <Label>{t("common.descriptionOptional")}</Label>
        <Textarea
          value={item.description || ""}
          onChange={(e) => onItemChange("description", e.target.value)}
          placeholder={t("launchpad.addDescription")}
        />
      </FullWidthFormGroup>

      <SaveButton className="save-button" type="submit">
        {t("common.save")}
      </SaveButton>
    </Form>
  );
};

export default WebsiteItemForm;
