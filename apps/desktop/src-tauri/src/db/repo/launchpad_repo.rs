use crate::db::error::DbResult;
use sqlx::{Row, SqlitePool};

#[derive(Debug, Clone, serde::Deserialize)]
pub struct SaveGroupInput {
    pub uuid: Option<String>,
    pub user_uuid: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub sort_order: Option<i64>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct SaveItemInput {
    pub uuid: Option<String>,
    pub user_uuid: Option<String>,
    pub group_uuid: String,
    pub title: String,
    pub url: String,
    pub url_lan: Option<String>,
    pub default_icon: Option<String>,
    pub local_icon_path: Option<String>,
    pub icon_source: Option<String>,
    pub description: Option<String>,
    pub background_color: Option<String>,
    pub sort_order: Option<i64>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct SaveSearchEngineInput {
    pub uuid: Option<String>,
    pub user_uuid: String,
    pub name: String,
    pub url_template: String,
    pub default_icon: Option<String>,
    pub local_icon_path: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct DefaultWebsiteGroupInput {
    pub name: String,
    pub description: Option<String>,
    pub sort_order: Option<i64>,
    pub items: Vec<DefaultWebsiteItemInput>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct DefaultWebsiteItemInput {
    pub title: String,
    pub url: String,
    pub default_icon: String,
    pub description: Option<String>,
    pub sort_order: Option<i64>,
}

pub async fn save_group(pool: &SqlitePool, group: &SaveGroupInput) -> DbResult<()> {
    if let Some(uuid) = &group.uuid {
        sqlx::query(
            "UPDATE website_groups SET name = ?, description = ?, sort_order = ? WHERE uuid = ?",
        )
        .bind(&group.name)
        .bind(&group.description)
        .bind(group.sort_order)
        .bind(uuid)
        .execute(pool)
        .await?;
    } else {
        sqlx::query(
            "INSERT INTO website_groups (uuid, user_uuid, name, description, sort_order) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(group.user_uuid.as_deref().unwrap_or_default())
        .bind(&group.name)
        .bind(&group.description)
        .bind(group.sort_order)
        .execute(pool)
        .await?;
    }

    Ok(())
}

pub async fn update_groups_order(pool: &SqlitePool, uuids: &[String]) -> DbResult<()> {
    let mut tx = pool.begin().await?;
    for (index, uuid) in uuids.iter().enumerate() {
        sqlx::query("UPDATE website_groups SET sort_order = ? WHERE uuid = ?")
            .bind(index as i64 + 1)
            .bind(uuid)
            .execute(tx.as_mut())
            .await?;
    }
    tx.commit().await?;
    Ok(())
}

pub async fn delete_group(pool: &SqlitePool, group_uuid: &str) -> DbResult<()> {
    let mut tx = pool.begin().await?;
    sqlx::query("UPDATE website_groups SET is_deleted = 1 WHERE uuid = ?")
        .bind(group_uuid)
        .execute(tx.as_mut())
        .await?;
    sqlx::query("UPDATE websites SET is_deleted = 1 WHERE group_uuid = ?")
        .bind(group_uuid)
        .execute(tx.as_mut())
        .await?;
    tx.commit().await?;
    Ok(())
}

pub async fn save_item(pool: &SqlitePool, item: &SaveItemInput) -> DbResult<()> {
    if let Some(uuid) = &item.uuid {
        sqlx::query(
            r#"
            UPDATE websites
            SET title = ?, url = ?, url_lan = ?, default_icon = ?, local_icon_path = ?,
                group_uuid = ?, sort_order = ?, description = ?, background_color = ?, icon_source = ?
            WHERE uuid = ?
            "#,
        )
        .bind(&item.title)
        .bind(&item.url)
        .bind(&item.url_lan)
        .bind(&item.default_icon)
        .bind(&item.local_icon_path)
        .bind(&item.group_uuid)
        .bind(item.sort_order)
        .bind(&item.description)
        .bind(&item.background_color)
        .bind(&item.icon_source)
        .bind(uuid)
        .execute(pool)
        .await?;
    } else {
        sqlx::query(
            r#"
            INSERT INTO websites (
                uuid, user_uuid, group_uuid, title, url, url_lan, default_icon, local_icon_path,
                sort_order, description, background_color, icon_source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(item.user_uuid.as_deref().unwrap_or_default())
        .bind(&item.group_uuid)
        .bind(&item.title)
        .bind(&item.url)
        .bind(&item.url_lan)
        .bind(&item.default_icon)
        .bind(&item.local_icon_path)
        .bind(item.sort_order)
        .bind(&item.description)
        .bind(&item.background_color)
        .bind(&item.icon_source)
        .execute(pool)
        .await?;
    }

    Ok(())
}

pub async fn update_items_order(pool: &SqlitePool, uuids: &[String]) -> DbResult<()> {
    let mut tx = pool.begin().await?;
    for (index, uuid) in uuids.iter().enumerate() {
        sqlx::query("UPDATE websites SET sort_order = ? WHERE uuid = ?")
            .bind(index as i64 + 1)
            .bind(uuid)
            .execute(tx.as_mut())
            .await?;
    }
    tx.commit().await?;
    Ok(())
}

pub async fn delete_item(pool: &SqlitePool, item_uuid: &str) -> DbResult<()> {
    sqlx::query("UPDATE websites SET is_deleted = 1 WHERE uuid = ?")
        .bind(item_uuid)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn ensure_default_data(
    pool: &SqlitePool,
    user_uuid: &str,
    groups: &[DefaultWebsiteGroupInput],
) -> DbResult<()> {
    let group_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM website_groups")
        .fetch_one(pool)
        .await?;
    let item_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM websites")
        .fetch_one(pool)
        .await?;

    if group_count > 0 || item_count > 0 {
        return Ok(());
    }

    let mut tx = pool.begin().await?;
    for group in groups {
        let group_uuid = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO website_groups (uuid, user_uuid, name, sort_order, description) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&group_uuid)
        .bind(user_uuid)
        .bind(&group.name)
        .bind(group.sort_order)
        .bind(&group.description)
        .execute(tx.as_mut())
        .await?;

        for item in &group.items {
            sqlx::query(
                "INSERT INTO websites (uuid, user_uuid, group_uuid, title, url, default_icon, sort_order, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(uuid::Uuid::new_v4().to_string())
            .bind(user_uuid)
            .bind(&group_uuid)
            .bind(&item.title)
            .bind(&item.url)
            .bind(&item.default_icon)
            .bind(item.sort_order)
            .bind(&item.description)
            .execute(tx.as_mut())
            .await?;
        }
    }
    tx.commit().await?;
    Ok(())
}

pub async fn save_search_engine(pool: &SqlitePool, engine: &SaveSearchEngineInput) -> DbResult<()> {
    if let Some(uuid) = &engine.uuid {
        sqlx::query(
            "UPDATE search_engines SET name = ?, url_template = ?, local_icon_path = ? WHERE uuid = ? AND user_uuid = ?",
        )
        .bind(&engine.name)
        .bind(&engine.url_template)
        .bind(&engine.local_icon_path)
        .bind(uuid)
        .bind(&engine.user_uuid)
        .execute(pool)
        .await?;
    } else {
        sqlx::query(
            "INSERT INTO search_engines (uuid, user_uuid, name, url_template, default_icon, local_icon_path, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(&engine.user_uuid)
        .bind(&engine.name)
        .bind(&engine.url_template)
        .bind(&engine.default_icon)
        .bind(&engine.local_icon_path)
        .bind(0_i64)
        .execute(pool)
        .await?;
    }

    Ok(())
}

pub async fn set_active_search_engine(
    pool: &SqlitePool,
    engine_uuid: &str,
    user_uuid: &str,
) -> DbResult<()> {
    let mut tx = pool.begin().await?;
    sqlx::query("UPDATE search_engines SET is_default = 0 WHERE user_uuid = ?")
        .bind(user_uuid)
        .execute(tx.as_mut())
        .await?;
    sqlx::query("UPDATE search_engines SET is_default = 1 WHERE user_uuid = ? AND uuid = ?")
        .bind(user_uuid)
        .bind(engine_uuid)
        .execute(tx.as_mut())
        .await?;
    tx.commit().await?;
    Ok(())
}

pub async fn clear_default_search_engine(pool: &SqlitePool, user_uuid: &str) -> DbResult<()> {
    sqlx::query("UPDATE search_engines SET is_default = 0 WHERE user_uuid = ?")
        .bind(user_uuid)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn delete_search_engine(pool: &SqlitePool, uuid: &str) -> DbResult<()> {
    sqlx::query("DELETE FROM search_engines WHERE uuid = ?")
        .bind(uuid)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn get_launchpad_groups(
    pool: &SqlitePool,
    user_uuid: &str,
) -> DbResult<Vec<serde_json::Value>> {
    let rows = sqlx::query(
        "SELECT * FROM website_groups WHERE user_uuid = ? AND is_deleted = 0 ORDER BY sort_order ASC, id ASC",
    )
    .bind(user_uuid)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(group_row_to_json).collect())
}

pub async fn get_launchpad_items(
    pool: &SqlitePool,
    user_uuid: &str,
) -> DbResult<Vec<serde_json::Value>> {
    let rows = sqlx::query(
        "SELECT * FROM websites WHERE user_uuid = ? AND is_deleted = 0 ORDER BY sort_order ASC, id ASC",
    )
    .bind(user_uuid)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(item_row_to_json).collect())
}

pub async fn get_search_engines(
    pool: &SqlitePool,
    user_uuid: &str,
) -> DbResult<Vec<serde_json::Value>> {
    let rows = sqlx::query(
        "SELECT *, 1 as is_deletable FROM search_engines WHERE user_uuid = ? ORDER BY sort_order ASC, name ASC",
    )
    .bind(user_uuid)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(search_engine_row_to_json).collect())
}

pub async fn get_default_search_engine(
    pool: &SqlitePool,
    user_uuid: &str,
) -> DbResult<Option<serde_json::Value>> {
    let row = sqlx::query(
        "SELECT *, 1 as is_deletable FROM search_engines WHERE user_uuid = ? AND is_default = 1 LIMIT 1",
    )
    .bind(user_uuid)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(search_engine_row_to_json))
}

fn group_row_to_json(row: sqlx::sqlite::SqliteRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.get::<i64, _>("id"),
        "uuid": row.get::<String, _>("uuid"),
        "user_uuid": row.get::<String, _>("user_uuid"),
        "name": row.get::<String, _>("name"),
        "description": row.get::<Option<String>, _>("description"),
        "sort_order": row.get::<Option<i64>, _>("sort_order"),
        "is_deleted": row.get::<i64, _>("is_deleted"),
        "created_at": row.get::<String, _>("created_at"),
        "updated_at": row.get::<String, _>("updated_at"),
    })
}

fn item_row_to_json(row: sqlx::sqlite::SqliteRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.get::<i64, _>("id"),
        "uuid": row.get::<String, _>("uuid"),
        "user_uuid": row.get::<String, _>("user_uuid"),
        "group_uuid": row.get::<String, _>("group_uuid"),
        "title": row.get::<String, _>("title"),
        "url": row.get::<String, _>("url"),
        "url_lan": row.get::<Option<String>, _>("url_lan"),
        "default_icon": row.get::<Option<String>, _>("default_icon"),
        "local_icon_path": row.get::<Option<String>, _>("local_icon_path"),
        "icon_source": row.get::<Option<String>, _>("icon_source"),
        "description": row.get::<Option<String>, _>("description"),
        "background_color": row.get::<Option<String>, _>("background_color"),
        "sort_order": row.get::<Option<i64>, _>("sort_order"),
        "is_deleted": row.get::<i64, _>("is_deleted"),
        "created_at": row.get::<String, _>("created_at"),
        "updated_at": row.get::<String, _>("updated_at"),
    })
}

fn search_engine_row_to_json(row: sqlx::sqlite::SqliteRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.get::<i64, _>("id"),
        "uuid": row.get::<String, _>("uuid"),
        "user_uuid": row.get::<String, _>("user_uuid"),
        "name": row.get::<String, _>("name"),
        "url_template": row.get::<String, _>("url_template"),
        "default_icon": row.get::<Option<String>, _>("default_icon"),
        "local_icon_path": row.get::<Option<String>, _>("local_icon_path"),
        "is_deletable": row.get::<i64, _>("is_deletable"),
    })
}
