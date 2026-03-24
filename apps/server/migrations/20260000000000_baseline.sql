-- 用户与认证
-- 说明：服务端用户主体与权限数据，uuid 为业务主键；created_at/updated_at 使用 UTC 毫秒级时间戳字符串。
CREATE TABLE IF NOT EXISTS users (
    uuid TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL,
    username_normalized TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    disabled_at TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TRIGGER IF NOT EXISTS set_users_updated_at
AFTER UPDATE ON users FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE uuid = OLD.uuid;
END;

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

-- Refresh Token 存储
-- 说明：登录刷新令牌，支持单设备登出与过期管理。
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY NOT NULL,
    user_uuid TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    last_used_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (user_uuid) REFERENCES users(uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_uuid ON refresh_tokens (user_uuid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens (token);

CREATE TRIGGER IF NOT EXISTS set_refresh_tokens_updated_at
AFTER UPDATE ON refresh_tokens FOR EACH ROW
BEGIN
    UPDATE refresh_tokens SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = OLD.id;
END;

-- 审计日志
-- 说明：记录关键操作，便于排查问题与审计。
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    actor_user_uuid TEXT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_uuid TEXT,
    meta TEXT,
    result TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (actor_user_uuid) REFERENCES users (uuid) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user ON audit_logs (actor_user_uuid);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs (target_uuid);

-- 同步会话与分片
-- 说明：服务端同步会话与分片记录，last_synced_rev 为毫秒级。
CREATE TABLE IF NOT EXISTS sync_sessions (
    session_id TEXT PRIMARY KEY,
    user_uuid TEXT NOT NULL,
    last_synced_rev INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    expires_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    chunk_counts INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sync_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    data_type TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(session_id, data_type, chunk_index),
    FOREIGN KEY (session_id) REFERENCES sync_sessions(session_id) ON DELETE CASCADE
);

-- 同步会话触发器
-- 说明：更新会话时刷新 updated_at。
CREATE TRIGGER IF NOT EXISTS set_sync_sessions_updated_at
AFTER UPDATE ON sync_sessions FOR EACH ROW
BEGIN
    UPDATE sync_sessions
    SET updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    WHERE session_id = OLD.session_id;
END;
