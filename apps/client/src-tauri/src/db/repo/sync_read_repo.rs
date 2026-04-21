use crate::db::error::DbResult;
use sqlx::{Row, SqlitePool};

pub struct LocalSyncData {
    pub website_groups: Vec<serde_json::Value>,
    pub websites: Vec<serde_json::Value>,
    pub search_engines: Vec<serde_json::Value>,
}

pub async fn create_sync_log(pool: &SqlitePool, session_id: &str, user_uuid: &str) -> DbResult<()> {
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO sync_logs (session_id, user_uuid, started_at, status) VALUES (?, ?, ?, 'running')",
    )
    .bind(session_id)
    .bind(user_uuid)
    .bind(now)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn finalize_sync_log(
    pool: &SqlitePool,
    session_id: &str,
    status: &str,
    summary: Option<&str>,
    error_text: Option<&str>,
) -> DbResult<()> {
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "UPDATE sync_logs SET finished_at = ?, status = ?, summary = ?, error = ? WHERE session_id = ?",
    )
    .bind(now)
    .bind(status)
    .bind(summary)
    .bind(error_text)
    .bind(session_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_last_sync_revision(pool: &SqlitePool, user_uuid: &str) -> DbResult<i64> {
    let revision = sqlx::query_scalar::<_, i64>(
        "SELECT COALESCE(last_synced_rev, 0) FROM sync_metadata WHERE user_uuid = ?",
    )
    .bind(user_uuid)
    .fetch_optional(pool)
    .await?
    .unwrap_or(0);
    Ok(revision)
}

pub async fn collect_local_sync_data(
    pool: &SqlitePool,
    user_uuid: &str,
) -> DbResult<LocalSyncData> {
    let website_groups = sqlx::query(
        "SELECT uuid, name, description, sort_order, is_deleted, rev, updated_at FROM website_groups WHERE user_uuid = ?",
    )
    .bind(user_uuid)
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| serde_json::json!({
        "uuid": row.get::<String, _>("uuid"),
        "name": row.get::<String, _>("name"),
        "description": row.get::<Option<String>, _>("description"),
        "sort_order": row.get::<Option<i64>, _>("sort_order"),
        "is_deleted": row.get::<i64, _>("is_deleted"),
        "rev": row.get::<i64, _>("rev"),
        "updated_at": row.get::<String, _>("updated_at"),
    }))
    .collect();

    let websites = sqlx::query(
        "SELECT uuid, group_uuid, title, url, url_lan, default_icon, local_icon_path, background_color, description, sort_order, is_deleted, rev, updated_at FROM websites WHERE user_uuid = ?",
    )
    .bind(user_uuid)
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| serde_json::json!({
        "uuid": row.get::<String, _>("uuid"),
        "group_uuid": row.get::<String, _>("group_uuid"),
        "title": row.get::<String, _>("title"),
        "url": row.get::<String, _>("url"),
        "url_lan": row.get::<Option<String>, _>("url_lan"),
        "default_icon": row.get::<Option<String>, _>("default_icon"),
        "local_icon_path": row.get::<Option<String>, _>("local_icon_path"),
        "background_color": row.get::<Option<String>, _>("background_color"),
        "description": row.get::<Option<String>, _>("description"),
        "sort_order": row.get::<Option<i64>, _>("sort_order"),
        "is_deleted": row.get::<i64, _>("is_deleted"),
        "rev": row.get::<i64, _>("rev"),
        "updated_at": row.get::<String, _>("updated_at"),
    }))
    .collect();

    let search_engines = sqlx::query(
        "SELECT uuid, name, url_template, default_icon, local_icon_path, is_default, sort_order, is_deleted, rev, updated_at FROM search_engines WHERE user_uuid = ?",
    )
    .bind(user_uuid)
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|row| serde_json::json!({
        "uuid": row.get::<String, _>("uuid"),
        "name": row.get::<String, _>("name"),
        "url_template": row.get::<String, _>("url_template"),
        "default_icon": row.get::<Option<String>, _>("default_icon"),
        "local_icon_path": row.get::<Option<String>, _>("local_icon_path"),
        "is_default": row.get::<i64, _>("is_default"),
        "sort_order": row.get::<Option<i64>, _>("sort_order"),
        "is_deleted": row.get::<i64, _>("is_deleted"),
        "rev": row.get::<i64, _>("rev"),
        "updated_at": row.get::<String, _>("updated_at"),
    }))
    .collect();

    Ok(LocalSyncData {
        website_groups,
        websites,
        search_engines,
    })
}
