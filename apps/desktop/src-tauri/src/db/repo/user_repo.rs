use crate::db::error::DbResult;
use sqlx::{Row, Sqlite, SqlitePool, Transaction};

const ANONYMOUS_USER_UUID: &str = "00000000-0000-0000-0000-000000000000";
const ANONYMOUS_USERNAME: &str = "anonymous";

#[derive(Debug, Clone)]
pub struct SaveUserInput {
    pub uuid: String,
    pub username: String,
    pub server_address: Option<String>,
    pub server_instance_uuid: Option<String>,
    pub token: Option<String>,
    pub refresh_token: Option<String>,
}

pub async fn init_local_db(pool: &SqlitePool) -> DbResult<()> {
    let mut tx = pool.begin().await?;
    ensure_user_row(&mut tx, ANONYMOUS_USER_UUID, ANONYMOUS_USERNAME, true).await?;
    tx.commit().await?;
    Ok(())
}

pub async fn save_user(pool: &SqlitePool, user: &SaveUserInput) -> DbResult<()> {
    let mut tx = pool.begin().await?;
    let exists = sqlx::query("SELECT 1 FROM users WHERE uuid = ?")
        .bind(&user.uuid)
        .fetch_optional(tx.as_mut())
        .await?
        .is_some();

    if exists {
        sqlx::query(
            r#"
            UPDATE users
            SET username = ?, server_address = ?, server_instance_uuid = ?, token = ?, refresh_token = ?
            WHERE uuid = ?
            "#,
        )
        .bind(&user.username)
        .bind(&user.server_address)
        .bind(&user.server_instance_uuid)
        .bind(&user.token)
        .bind(&user.refresh_token)
        .bind(&user.uuid)
        .execute(tx.as_mut())
        .await?;
    } else {
        sqlx::query(
            r#"
            INSERT INTO users (
                uuid, username, server_address, server_instance_uuid, token, refresh_token
            ) VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&user.uuid)
        .bind(&user.username)
        .bind(&user.server_address)
        .bind(&user.server_instance_uuid)
        .bind(&user.token)
        .bind(&user.refresh_token)
        .execute(tx.as_mut())
        .await?;
    }

    tx.commit().await?;
    Ok(())
}

pub async fn update_username(pool: &SqlitePool, uuid: &str, username: &str) -> DbResult<()> {
    sqlx::query("UPDATE users SET username = ? WHERE uuid = ?")
        .bind(username)
        .bind(uuid)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn set_login_status(pool: &SqlitePool, uuid: &str, is_logged_in: bool) -> DbResult<()> {
    sqlx::query("UPDATE users SET is_logged_in = ? WHERE uuid = ?")
        .bind(if is_logged_in { 1 } else { 0 })
        .bind(uuid)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn update_server_address(
    pool: &SqlitePool,
    uuid: &str,
    server_address: &str,
) -> DbResult<()> {
    sqlx::query("UPDATE users SET server_address = ? WHERE uuid = ?")
        .bind(server_address)
        .bind(uuid)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn delete_user_with_data(pool: &SqlitePool, uuid: &str) -> DbResult<u64> {
    let result = sqlx::query("DELETE FROM users WHERE uuid = ?")
        .bind(uuid)
        .execute(pool)
        .await?;
    Ok(result.rows_affected())
}

pub async fn get_all_users(pool: &SqlitePool) -> DbResult<Vec<serde_json::Value>> {
    let rows = sqlx::query(
        "SELECT uuid, username, is_logged_in AS isLoggedIn, server_address AS serverAddress, server_instance_uuid AS serverInstanceUuid, token, refresh_token AS refreshToken FROM users WHERE is_logged_in = 1",
    )
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| {
            serde_json::json!({
                "uuid": row.get::<String, _>("uuid"),
                "username": row.get::<String, _>("username"),
                "isLoggedIn": row.get::<i64, _>("isLoggedIn"),
                "serverAddress": row.get::<Option<String>, _>("serverAddress"),
                "serverInstanceUuid": row.get::<Option<String>, _>("serverInstanceUuid"),
                "token": row.get::<Option<String>, _>("token"),
                "refreshToken": row.get::<Option<String>, _>("refreshToken"),
            })
        })
        .collect())
}

pub async fn get_used_icon_names(pool: &SqlitePool) -> DbResult<Vec<String>> {
    let website_rows = sqlx::query(
        "SELECT DISTINCT local_icon_path FROM websites WHERE local_icon_path IS NOT NULL AND is_deleted = 0",
    )
    .fetch_all(pool)
    .await?;
    let search_engine_rows = sqlx::query(
        "SELECT DISTINCT local_icon_path FROM search_engines WHERE local_icon_path IS NOT NULL",
    )
    .fetch_all(pool)
    .await?;

    let mut names = std::collections::BTreeSet::new();
    for row in website_rows
        .into_iter()
        .chain(search_engine_rows.into_iter())
    {
        if let Some(name) = row.get::<Option<String>, _>("local_icon_path") {
            names.insert(name);
        }
    }

    Ok(names.into_iter().collect())
}

async fn ensure_user_row(
    tx: &mut Transaction<'_, Sqlite>,
    uuid: &str,
    username: &str,
    is_logged_in: bool,
) -> DbResult<()> {
    let exists = sqlx::query("SELECT 1 FROM users WHERE uuid = ?")
        .bind(uuid)
        .fetch_optional(tx.as_mut())
        .await?
        .is_some();

    if !exists {
        sqlx::query("INSERT INTO users (uuid, username, is_logged_in) VALUES (?, ?, ?)")
            .bind(uuid)
            .bind(username)
            .bind(if is_logged_in { 1 } else { 0 })
            .execute(tx.as_mut())
            .await?;
    }

    Ok(())
}
