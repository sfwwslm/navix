import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getMenuItems, MenuItem } from "@/constants/menuItems";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { useModal } from "@/contexts";
import SettingsModal from "@/features/Settings/SettingsModal";

const MenuBar = styled.nav`
  border: 1px solid ${(props) => props.theme.colors.header.border};
  border-radius: 5px;
  height: 100%;
`;

const MenuList = styled.ul`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  height: 100%;
`;

const MenuItemStyled = styled.li<{ $isActive: boolean }>`
  cursor: pointer;
  position: relative;
  user-select: none;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-width: 30px;
  margin: 0 5px;
  color: ${(props) => props.theme.colors.header.text};

  &:hover {
    background-color: ${(props) => props.theme.colors.header.hoverBackground};
    box-shadow: 0 0 8px ${(props) => props.theme.colors.header.hoverShadow};
  }

  &.active {
    font-weight: bold;
    color: ${(props) => props.theme.colors.primary};
  }

  span {
    padding: 0 3px;
  }
`;

const SubmenuContainer = styled.ul`
  position: absolute; /* 绝对定位在父级 li */
  top: 100%; /* 对齐到父级底部 */
  left: 0; /* 从父级左侧开始 */
  list-style: none; /* 移除默认列表样式 */
  padding: 0; /* 移除默认内边距 */
  border: 1px solid ${(props) => props.theme.colors.header.border};
  border-radius: ${(props) => props.theme.radii.small};
  color: ${(props) => props.theme.colors.textPrimary};
  z-index: 1000; /* 确保浮层在上方 */
  background-color: ${(props) => props.theme.colors.background};
  min-width: max-content; /* 宽度自适应内容 */
  white-space: nowrap; /* 防止内容换行 */
`;

const SubmenuItemStyled = styled.li<{ $isActive: boolean }>`
  margin: 5px;
  font-size: 0.8em;
  border: 1px solid ${(props) => props.theme.colors.header.border};
  border-radius: ${(props) => props.theme.radii.small};
  padding: 5px 15px;
  cursor: pointer;
  color: ${(props) => props.theme.colors.textPrimary};

  &:hover {
    background-color: ${(props) => props.theme.colors.header.hoverBackground};
    box-shadow: 0 0 8px ${(props) => props.theme.colors.header.hoverShadow};
  }

  &.active {
    font-weight: bold;
    color: ${(props) => props.theme.colors.primary};
  }
`;

interface SubmenuProps {
  items: MenuItem[];
  currentPath: string;
  onItemClick: (item: MenuItem) => void;
}

const Submenu: React.FC<SubmenuProps> = React.memo(
  ({ items, currentPath, onItemClick }) => {
    return (
      <SubmenuContainer>
        {items.map((sub) => (
          <SubmenuItemStyled
            key={sub.id}
            $isActive={currentPath === sub.url}
            onClick={(e) => {
              e.stopPropagation();
              onItemClick(sub);
            }}
          >
            <span>{sub.label}</span>
          </SubmenuItemStyled>
        ))}
      </SubmenuContainer>
    );
  },
);
Submenu.displayName = "Submenu";

const Menus: React.FC = () => {
  const { openModal } = useModal();
  const [activeSubmenuId, setActiveSubmenuId] = useState<number | null>(null);
  const [isHoverMode, setIsHoverMode] = useState(false);
  const [lastHoveredWithChildrenId, setLastHoveredWithChildrenId] = useState<
    number | null
  >(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const currentPath = location.pathname;
  const menuItems = getMenuItems(t);

  const closeAllSubmenus = useCallback(() => {
    setActiveSubmenuId(null); //
    setIsHoverMode(false); //
    setLastHoveredWithChildrenId(null); //
  }, []);
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      if (isHoverMode) {
        if (
          menuRef.current &&
          !menuRef.current.contains(event.target as Node)
        ) {
          closeAllSubmenus();
        }
      }
    };

    document.addEventListener("mousedown", handleGlobalClick);
    return () => {
      document.removeEventListener("mousedown", handleGlobalClick);
    };
  }, [isHoverMode, closeAllSubmenus]);

  const handleMenuItemClick = useCallback(
    (item: MenuItem) => {
      if (item.children) {
        if (isHoverMode) {
          if (activeSubmenuId === item.id) {
            closeAllSubmenus();
          } else {
            setActiveSubmenuId(item.id);
            setLastHoveredWithChildrenId(item.id);
          }
        } else {
          setActiveSubmenuId(item.id);
          setIsHoverMode(true);
          setLastHoveredWithChildrenId(item.id);
        }
      } else {
        void navigate(item.url);
        closeAllSubmenus();
      }
    },
    [navigate, activeSubmenuId, isHoverMode, closeAllSubmenus],
  );

  const handleSubmenuItemClick = useCallback(
    (sub: MenuItem) => {
      if (sub.url === "/help/settings") {
        openModal((close) => <SettingsModal onClose={close} />, {
          key: "settings",
        }); //
      } else {
        void navigate(sub.url);
      }
      closeAllSubmenus();
    },
    [navigate, closeAllSubmenus, openModal],
  );

  const handleMouseEnter = useCallback(
    (itemId: number) => {
      if (isHoverMode) {
        const hoveredItem = menuItems.find((menu) => menu.id === itemId);
        if (hoveredItem?.children) {
          setActiveSubmenuId(itemId);
          setLastHoveredWithChildrenId(itemId);
        } else {
          setActiveSubmenuId(lastHoveredWithChildrenId);
        }
      }
    },
    [isHoverMode, lastHoveredWithChildrenId, menuItems],
  );

  return (
    <MenuBar ref={menuRef}>
      <MenuList>
        {menuItems.map((item) => {
          const isActive =
            currentPath === item.url ||
            item.children?.some((sub) => sub.url === currentPath) ||
            false;
          const isSubmenuOpen = activeSubmenuId === item.id;

          return (
            <MenuItemStyled
              key={item.id}
              $isActive={isActive}
              onClick={() => handleMenuItemClick(item)}
              onMouseEnter={() => handleMouseEnter(item.id)}
            >
              <span>{item.label}</span>
              {item.children && isSubmenuOpen && (
                <Submenu
                  items={item.children}
                  currentPath={currentPath}
                  onItemClick={handleSubmenuItemClick}
                />
              )}
            </MenuItemStyled>
          );
        })}
      </MenuList>
    </MenuBar>
  );
};

export default Menus;
