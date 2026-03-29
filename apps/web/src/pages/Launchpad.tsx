import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { apiFetch, apiFetchResponse, isAuthError } from "../api";
import { clearUserAccessToken, getUserAccessToken } from "../auth/tokenStore";
import DynamicIcon from "../components/DynamicIcon";
import { useI18n } from "../i18n/useI18n";
import type { AppShellOutletContext } from "../layouts/AppShell";
import iconStyles from "../components/DynamicIcon.module.css";
import styles from "./Launchpad.module.css";
import type { Claims } from "@navix/shared-ts";

interface LaunchpadWebsite {
  uuid: string;
  title: string;
  url: string;
  url_lan?: string | null;
  default_icon?: string | null;
  local_icon_path?: string | null;
  background_color?: string | null;
  description?: string | null;
  sort_order?: number | null;
}

interface LaunchpadGroup {
  uuid: string;
  name: string;
  description?: string | null;
  sort_order?: number | null;
  websites: LaunchpadWebsite[];
}

type SiteContextMenuState = {
  site: LaunchpadWebsite;
  x: number;
  y: number;
};

const DefaultIcon = ({ label, alt }: { label: string; alt: string }) => (
  <div className={styles.defaultIcon}>
    <svg viewBox="0 0 48 48" role="img" aria-label={alt}>
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3dd5f3" />
          <stop offset="100%" stopColor="#6c8bff" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#grad)" opacity="0.95" />
      <path
        d="M10 27c6 2.5 12.5 2.5 19 0 1-.4 1.5-1.7.9-2.6C27.5 17 22.5 14 17 14c-3.6 0-6.8 1.4-9.5 4-.9.9-.5 2.4.5 2.9z"
        fill="#0c1220"
        opacity="0.38"
      />
      <circle cx="32" cy="16" r="3" fill="#e9f5ff" />
      <circle cx="16" cy="30" r="2" fill="#e9f5ff" opacity="0.8" />
    </svg>
    <span className={styles.defaultIconLabel}>{label}</span>
  </div>
);

const LaunchpadPage = () => {
  const { launchpadSidebarEnabled, t } = useI18n();
  const [launchpad, setLaunchpad] = useState<LaunchpadGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<SiteContextMenuState | null>(
    null,
  );
  const [editSite, setEditSite] = useState<LaunchpadWebsite | null>(null);
  const [activeGroupUuid, setActiveGroupUuid] = useState<string | null>(null);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [userUuid, setUserUuid] = useState<string | null>(null);
  const [iconErrors, setIconErrors] = useState<Record<string, boolean>>({});
  const [iconUrls, setIconUrls] = useState<Record<string, string>>({});
  const iconUrlsRef = useRef<Record<string, string>>({});
  const groupRefs = useRef<Record<string, HTMLElement | null>>({});
  const navigate = useNavigate();
  const { launchpadMode: mode } = useOutletContext<AppShellOutletContext>();

  useEffect(() => {
    const token = getUserAccessToken();
    if (!token) {
      void navigate("/login");
      return;
    }

    const fetchBasic = async () => {
      setLoading(true);
      setError(null);
      try {
        // 获取用户信息用于本地图标路径
        const welcomeResp = await apiFetch<Claims>("/api/v1/welcome", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserUuid(welcomeResp.data?.sub ?? null);

        const response = await apiFetch<LaunchpadGroup[]>("/api/v1/launchpad", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLaunchpad(response.data || []);
      } catch (err) {
        if (isAuthError(err)) {
          clearUserAccessToken();
          void navigate("/login");
          return;
        }
        console.error(err);
        setError(t("launchpad.fetchFailed"));
      } finally {
        setLoading(false);
      }
    };

    void fetchBasic();
  }, [navigate, t]);

  const sortedLaunchpad = useMemo(() => {
    const byOrderThen = <T extends { sort_order?: number | null }>(
      a: T,
      b: T,
      fallback: (x: T, y: T) => number,
    ) => {
      const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return fallback(a, b);
    };

    const sortedGroups = [...launchpad]
      .map((group) => ({
        ...group,
        websites: [...group.websites].sort((a, b) =>
          byOrderThen(a, b, (x, y) => x.title.localeCompare(y.title)),
        ),
      }))
      .sort((a, b) =>
        byOrderThen(a, b, (x, y) => x.name.localeCompare(y.name)),
      );

    return sortedGroups;
  }, [launchpad]);

  useEffect(() => {
    iconUrlsRef.current = iconUrls;
  }, [iconUrls]);

  useEffect(() => {
    const token = getUserAccessToken();
    if (!token || !userUuid) {
      return;
    }

    const controller = new AbortController();
    const sitesWithLocalIcons = launchpad
      .flatMap((group) => group.websites)
      .filter(
        (site) =>
          site.local_icon_path &&
          !iconErrors[site.uuid] &&
          !iconUrls[site.uuid],
      );

    const fetchIcons = async () => {
      await Promise.all(
        sitesWithLocalIcons.map(async (site) => {
          try {
            const response = await apiFetchResponse(
              `/api/v1/icons/download/${userUuid}/${site.local_icon_path}`,
              {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
              },
            );
            if (!response.ok) {
              throw new Error(`Icon load failed: ${response.status}`);
            }
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            setIconUrls((prev) => {
              if (prev[site.uuid]) {
                URL.revokeObjectURL(objectUrl);
                return prev;
              }
              return { ...prev, [site.uuid]: objectUrl };
            });
          } catch (err) {
            if (controller.signal.aborted) {
              return;
            }
            console.error("拉取站点图标失败", err);
            setIconErrors((prev) => ({ ...prev, [site.uuid]: true }));
          }
        }),
      );
    };

    if (sitesWithLocalIcons.length > 0) {
      void fetchIcons();
    }

    return () => {
      controller.abort();
    };
  }, [launchpad, userUuid, iconErrors, iconUrls]);

  useEffect(() => {
    return () => {
      Object.values(iconUrlsRef.current).forEach((url) =>
        URL.revokeObjectURL(url),
      );
    };
  }, []);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const closeContextMenu = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    window.addEventListener("click", closeContextMenu);
    window.addEventListener("scroll", closeContextMenu, true);
    window.addEventListener("resize", closeContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", closeContextMenu);
      window.removeEventListener("scroll", closeContextMenu, true);
      window.removeEventListener("resize", closeContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!launchpadSidebarEnabled || sortedLaunchpad.length === 0) {
      setActiveGroupUuid(null);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries.length > 0) {
          setActiveGroupUuid(visibleEntries[0].target.id);
        }
      },
      {
        root: null,
        rootMargin: "-120px 0px -45% 0px",
        threshold: [0.1, 0.35, 0.6],
      },
    );

    sortedLaunchpad.forEach((group) => {
      const element = groupRefs.current[group.uuid];
      if (element) {
        observer.observe(element);
      }
    });

    if (!activeGroupUuid && sortedLaunchpad[0]) {
      setActiveGroupUuid(sortedLaunchpad[0].uuid);
    }

    return () => {
      observer.disconnect();
    };
  }, [activeGroupUuid, launchpadSidebarEnabled, sortedLaunchpad]);

  const handleOpenSite = (site: LaunchpadWebsite) => {
    const targetUrl = mode === "lan" && site.url_lan ? site.url_lan : site.url;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const handleContextMenu = (e: React.MouseEvent, site: LaunchpadWebsite) => {
    e.preventDefault();
    setContextMenu({
      site,
      x: Math.min(e.clientX, window.innerWidth - 188),
      y: Math.min(e.clientY, window.innerHeight - 64),
    });
  };

  return (
    <>
      <div
        className={`launchpad-page ${styles.pageShell}`}
        data-page="launchpad"
        data-ui="launchpad-page"
      >
        {loading && (
          <div className={styles.stateCard} data-ui="launchpad-loading">
            {t("launchpad.loading")}
          </div>
        )}
        {!loading && error && (
          <div
            className={`${styles.stateCard} ${styles.error}`}
            data-ui="launchpad-error"
          >
            {error}
          </div>
        )}
        {!loading && !error && sortedLaunchpad.length > 0 ? (
          <div className={styles.pageLayout} data-slot="launchpad-layout">
            {sortedLaunchpad.length > 0 && launchpadSidebarEnabled ? (
              <>
                <div
                  className={styles.groupSidebarTrigger}
                  data-ui="launchpad-sidebar-trigger"
                  onMouseEnter={() => setSidebarHovered(true)}
                >
                  <span className={styles.groupSidebarHint} aria-hidden="true">
                    <span className={styles.groupSidebarHintLine} />
                    <span className={styles.groupSidebarHintArrow}>
                      <svg viewBox="0 0 24 24" fill="none">
                        <path
                          d="m9 6 6 6-6 6"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </span>
                </div>
                <aside
                  className={`launchpad-group-sidebar ${styles.groupSidebar}`}
                  data-ui="launchpad-sidebar"
                  data-visible={sidebarHovered}
                  aria-label={t("launchpad.groupSidebar")}
                  onMouseEnter={() => setSidebarHovered(true)}
                  onMouseLeave={() => setSidebarHovered(false)}
                >
                  <div className={styles.groupSidebarRail}>
                    {sortedLaunchpad.map((group) => (
                      <button
                        key={group.uuid}
                        type="button"
                        className={styles.groupSidebarButton}
                        data-ui="launchpad-sidebar-button"
                        data-entity="launchpad-group"
                        data-group-uuid={group.uuid}
                        data-active={activeGroupUuid === group.uuid}
                        onClick={() => {
                          const section = groupRefs.current[group.uuid];
                          if (section) {
                            section.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                            setActiveGroupUuid(group.uuid);
                          }
                          setSidebarHovered(false);
                        }}
                      >
                        {group.name}
                      </button>
                    ))}
                  </div>
                </aside>
              </>
            ) : null}

            {sortedLaunchpad.length > 0 ? (
              <div
                className={`launchpad-group-list ${styles.groupList}`}
                data-slot="launchpad-group-list"
              >
                {sortedLaunchpad.map((group) => (
                  <section
                    key={group.uuid}
                    id={group.uuid}
                    ref={(element) => {
                      groupRefs.current[group.uuid] = element;
                    }}
                    className={`launchpad-group-card ${styles.groupCard}`}
                    data-ui="launchpad-group-card"
                    data-entity="launchpad-group"
                    data-group-uuid={group.uuid}
                  >
                    <div
                      className={`launchpad-group-header ${styles.groupHeader}`}
                      data-slot="launchpad-group-header"
                    >
                      <p className={styles.groupName}>{group.name}</p>
                      <span className={styles.groupBadge}>
                        {t("launchpad.sitesCount", {
                          count: group.websites.length,
                        })}
                      </span>
                    </div>
                    <div
                      className={`launchpad-site-grid ${styles.siteGrid}`}
                      data-slot="launchpad-site-grid"
                    >
                      {group.websites.map((site) => (
                        <article
                          key={site.uuid}
                          className={`launchpad-site-card ${styles.siteCard}`}
                          data-ui="launchpad-site-card"
                          data-entity="launchpad-site"
                          data-site-uuid={site.uuid}
                          onClick={() => handleOpenSite(site)}
                          onContextMenu={(e) => handleContextMenu(e, site)}
                        >
                          <div className={styles.iconBubble}>
                            <DynamicIcon
                              alt={site.title}
                              className={iconStyles.icon}
                              defaultIcon={site.default_icon}
                              localIconUrl={
                                site.local_icon_path &&
                                iconUrls[site.uuid] &&
                                !iconErrors[site.uuid]
                                  ? iconUrls[site.uuid]
                                  : null
                              }
                              fallback={
                                <DefaultIcon
                                  label={site.title.charAt(0).toUpperCase()}
                                  alt={t("launchpad.defaultIcon")}
                                />
                              }
                            />
                          </div>
                          <div className={styles.siteContent}>
                            <p className={styles.siteTitle}>{site.title}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {contextMenu ? (
        <div
          className={`launchpad-context-menu ${styles.contextMenu}`}
          data-ui="launchpad-context-menu"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={styles.contextMenuButton}
            data-ui="launchpad-edit-site-button"
            onClick={() => {
              setEditSite(contextMenu.site);
              setContextMenu(null);
            }}
          >
            {t("launchpad.edit")}
          </button>
        </div>
      ) : null}

      {editSite && (
        <div
          className={`launchpad-site-modal-overlay ${styles.modalOverlay}`}
          data-ui="launchpad-site-modal-overlay"
          onClick={() => setEditSite(null)}
        >
          <div
            className={`launchpad-site-modal ${styles.modalCard}`}
            data-ui="launchpad-site-modal"
            data-entity="launchpad-site"
            data-site-uuid={editSite.uuid}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t("launchpad.editTitle")}
          >
            <header className={styles.modalHeader}>
              <div className={styles.modalIdentity}>
                <div className={styles.iconBubble}>
                  <DynamicIcon
                    alt={editSite.title}
                    className={iconStyles.icon}
                    defaultIcon={editSite.default_icon}
                    localIconUrl={
                      editSite.local_icon_path &&
                      iconUrls[editSite.uuid] &&
                      !iconErrors[editSite.uuid]
                        ? iconUrls[editSite.uuid]
                        : null
                    }
                    fallback={
                      <DefaultIcon
                        label={editSite.title.charAt(0).toUpperCase()}
                        alt={t("launchpad.defaultIcon")}
                      />
                    }
                  />
                </div>
                <div className={styles.modalIdentityText}>
                  <p className={styles.modalEyebrow}>{t("launchpad.edit")}</p>
                  <p className={styles.siteTitle}>{editSite.title}</p>
                  <p className={styles.modalSubtitle}>
                    {t("launchpad.editDescription")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={() => setEditSite(null)}
                aria-label={t("common.close")}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m6 6 12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </header>
            <div className={styles.modalBody}>
              <section className={styles.modalSection}>
                <p className={styles.modalLabel}>
                  {t("launchpad.currentModeLink")}
                </p>
                <p className={styles.modalUrl}>
                  {mode === "lan" && editSite.url_lan
                    ? editSite.url_lan
                    : editSite.url}
                </p>
              </section>
              <section className={styles.modalSectionGrid}>
                <div className={styles.modalField}>
                  <p className={styles.modalLabel}>
                    {t("launchpad.editTarget")}
                  </p>
                  <p className={styles.modalUrl}>{editSite.url}</p>
                </div>
                <div className={styles.modalField}>
                  <p className={styles.modalLabel}>
                    {t("launchpad.editLanTarget")}
                  </p>
                  <p className={styles.modalUrl}>
                    {editSite.url_lan || t("common.unknown")}
                  </p>
                </div>
              </section>
              <section className={styles.modalSection}>
                <p className={styles.modalLabel}>
                  {t("launchpad.description")}
                </p>
                <p className={styles.modalDesc}>
                  {editSite.description || t("launchpad.emptyDescription")}
                </p>
              </section>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.ghostButton}
                onClick={() => setEditSite(null)}
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LaunchpadPage;
