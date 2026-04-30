import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import styles from "./UserMenu.module.css";
import icon from "/icon.ico";

interface UserMenuProps {
  onLogout: () => void;
}

/**
 * 渲染页面右上角的用户操作菜单，提供用户入口和退出登录操作。
 */
const UserMenu = ({ onLogout }: UserMenuProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useCurrentUser({ redirectTo: "/login" });

  // 点击外部关闭菜单的 effect
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    // 只有当菜单打开时才监听
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // 清理函数
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // 点击菜单项后关闭菜单
  const handleMenuItemClick = () => {
    setIsMenuOpen(false);
  };

  const handleLogoutClick = () => {
    handleMenuItemClick();
    onLogout();
  };

  return (
    <div className={styles.userMenuContainer} ref={menuRef} data-ui="user-menu">
      <button
        className={styles.iconButton}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="用户菜单"
        data-ui="user-menu-toggle"
      >
        <img src={icon} alt="用户头像" className={styles.avatarIcon} />
      </button>

      {/* 使用 isMenuOpen 状态来动态添加 'open' 类 */}
      <div
        className={`${styles.dropdownContent} ${isMenuOpen ? styles.open : ""}`}
        data-slot="user-menu-dropdown"
      >
        <Link
          to="/launchpad"
          className={styles.dropdownItem}
          data-ui="user-menu-launchpad-link"
          onClick={handleMenuItemClick}
        >
          Launchpad
        </Link>
        <Link
          to="/settings"
          className={styles.dropdownItem}
          data-ui="user-menu-settings-link"
          onClick={handleMenuItemClick}
        >
          用户中心
        </Link>
        <button
          onClick={handleLogoutClick}
          className={styles.dropdownItem}
          data-ui="user-menu-logout-button"
        >
          退出登录
        </button>
      </div>
    </div>
  );
};

export default UserMenu;
