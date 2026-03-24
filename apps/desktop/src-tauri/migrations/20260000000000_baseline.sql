-- 用户登录与令牌缓存
-- 说明：客户端本地登录状态与服务端令牌缓存；用于多服务端场景（server_instance_uuid）。
CREATE TABLE IF NOT EXISTS users (
    uuid TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL,
    is_logged_in INTEGER NOT NULL DEFAULT 0,
    server_address TEXT,
    server_instance_uuid TEXT,
    token TEXT,
    refresh_token TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (server_instance_uuid, username)
);

CREATE TRIGGER IF NOT EXISTS set_users_updated_at
AFTER UPDATE ON users FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE uuid = OLD.uuid;
END;

-- 同步元数据
-- 说明：客户端与服务端同步进度；last_synced_rev 为毫秒级。
CREATE TABLE IF NOT EXISTS sync_metadata (
    user_uuid TEXT PRIMARY KEY NOT NULL,
    last_synced_at TEXT,
    device_id TEXT,
    last_synced_rev INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_uuid) REFERENCES users (uuid) ON DELETE CASCADE
);

-- SYNC_SHARED_SCHEMA: website_groups
-- IMPORTANT: 客户端/服务端必须保持表结构、索引、约束、触发器完全一致。
-- 网站分组
-- 说明：导航分组；rev 为毫秒级变更版本。
CREATE TABLE IF NOT EXISTS website_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    user_uuid TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    rev INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000
        + CAST((strftime('%f','now') - strftime('%S','now')) * 1000 AS INTEGER)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (user_uuid) REFERENCES users (uuid) ON DELETE CASCADE
);

-- 网站分组触发器
-- 说明：更新时自动刷新 updated_at 与 rev（毫秒级）。
CREATE TRIGGER IF NOT EXISTS set_website_groups_updated_at
AFTER UPDATE ON website_groups FOR EACH ROW
BEGIN
    UPDATE website_groups
    SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        rev = (CAST(strftime('%s','now') AS INTEGER) * 1000
               + CAST((strftime('%f','now') - strftime('%S','now')) * 1000 AS INTEGER))
    WHERE id = OLD.id;
END;

-- SYNC_SHARED_SCHEMA: websites
-- IMPORTANT: 客户端/服务端必须保持表结构、索引、约束、触发器完全一致。
-- 网站
-- 说明：导航网站条目；icon_source 记录图标来源；rev 为毫秒级变更版本。
CREATE TABLE IF NOT EXISTS websites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    user_uuid TEXT NOT NULL,
    group_uuid TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    url_lan TEXT,
    default_icon TEXT,
    local_icon_path TEXT,
    icon_source TEXT,
    description TEXT,
    background_color TEXT,
    sort_order INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    rev INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000
        + CAST((strftime('%f','now') - strftime('%S','now')) * 1000 AS INTEGER)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (user_uuid) REFERENCES users (uuid) ON DELETE CASCADE,
    FOREIGN KEY (group_uuid) REFERENCES website_groups (uuid) ON DELETE CASCADE
);

-- 网站触发器
-- 说明：更新时自动刷新 updated_at 与 rev（毫秒级）。
CREATE TRIGGER IF NOT EXISTS set_websites_updated_at
AFTER UPDATE ON websites FOR EACH ROW
BEGIN
    UPDATE websites
    SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        rev = (CAST(strftime('%s','now') AS INTEGER) * 1000
               + CAST((strftime('%f','now') - strftime('%S','now')) * 1000 AS INTEGER))
    WHERE id = OLD.id;
END;

-- SYNC_SHARED_SCHEMA: search_engines
-- IMPORTANT: 客户端/服务端必须保持表结构、索引、约束、触发器完全一致。
-- 搜索引擎
-- 说明：用户自定义搜索引擎；rev 为毫秒级变更版本。
CREATE TABLE IF NOT EXISTS search_engines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    user_uuid TEXT NOT NULL,
    name TEXT NOT NULL,
    url_template TEXT NOT NULL,
    default_icon TEXT,
    local_icon_path TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    rev INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000
        + CAST((strftime('%f','now') - strftime('%S','now')) * 1000 AS INTEGER)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (user_uuid) REFERENCES users (uuid) ON DELETE CASCADE,
    UNIQUE(user_uuid, name)
);

-- 搜索引擎触发器
-- 说明：更新时自动刷新 updated_at 与 rev（毫秒级）。
CREATE TRIGGER IF NOT EXISTS set_search_engines_updated_at
AFTER UPDATE ON search_engines FOR EACH ROW
BEGIN
    UPDATE search_engines
    SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        rev = (CAST(strftime('%s','now') AS INTEGER) * 1000
               + CAST((strftime('%f','now') - strftime('%S','now')) * 1000 AS INTEGER))
    WHERE id = OLD.id;
END;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_default_search_engine_per_user
ON search_engines (user_uuid)
WHERE is_default = 1;

-- 同步日志
-- 说明：客户端同步过程记录（开始/结束/结果），便于排查异常。
CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    user_uuid TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL DEFAULT 'running',
    summary TEXT,
    error TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_user ON sync_logs(user_uuid, started_at DESC);
