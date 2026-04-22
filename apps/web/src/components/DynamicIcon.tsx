import { Icon as Iconify } from "@iconify/react";
import type { ReactNode } from "react";
import styles from "./DynamicIcon.module.css";

type DynamicIconProps = {
  defaultIcon?: string | null;
  localIconUrl?: string | null;
  alt: string;
  fallback: ReactNode;
  className?: string;
  unstyled?: boolean;
};

/**
 * Web 端动态图标组件。
 * 优先使用本地图标 URL，其次解析 Iconify 名称，最后回退到占位图标。
 */
const DynamicIcon = ({
  defaultIcon,
  localIconUrl,
  alt,
  fallback,
  className,
  unstyled = false,
}: DynamicIconProps) => {
  const mergedClassName = [styles.icon, className].filter(Boolean).join(" ");

  if (localIconUrl) {
    return <img src={localIconUrl} alt={alt} className={mergedClassName} />;
  }

  if (defaultIcon && defaultIcon.includes(":")) {
    return (
      <Iconify
        icon={defaultIcon}
        className={
          unstyled
            ? mergedClassName
            : [mergedClassName, styles.iconifyIcon].join(" ")
        }
        aria-label={alt}
        role="img"
      />
    );
  }

  return <>{fallback}</>;
};

export default DynamicIcon;
