use crate::models::sync::DataType;
use crate::models::sync_session::SyncSessionEntity;
use anyhow::Result;
use chrono::{Duration, Utc};
use sqlx::SqlitePool;

/// 会话默认存活时间（分钟），超过则视为过期
const SESSION_TTL_MINUTES: i64 = 30;

/// 创建并持久化会话，返回 session_id
pub async fn create_session(
    pool: &SqlitePool,
    session_id: String,
    user_uuid: String,
    last_synced_rev: i64,
) -> Result<()> {
    let expires_at = (Utc::now() + Duration::minutes(SESSION_TTL_MINUTES))
        .to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    sqlx::query(
        r#"
        INSERT INTO sync_sessions (session_id, user_uuid, last_synced_rev, expires_at)
        VALUES (?1, ?2, ?3, ?4)
        "#,
    )
    .bind(session_id)
    .bind(user_uuid)
    .bind(last_synced_rev)
    .bind(expires_at)
    .execute(pool)
    .await?;
    Ok(())
}

/// 持久化已接收的分块，使用 UPSERT 保证幂等。返回是否新插入。
pub async fn upsert_chunk(
    pool: &SqlitePool,
    session_id: &str,
    data_type: &DataType,
    chunk_index: i64,
    checksum: &str,
) -> Result<bool> {
    let data_type_str = data_type_as_str(data_type);
    let rows = sqlx::query(
        r#"
        INSERT INTO sync_chunks (session_id, data_type, chunk_index, checksum)
        VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(session_id, data_type, chunk_index) DO UPDATE SET checksum = excluded.checksum
        "#,
    )
    .bind(session_id)
    .bind(data_type_str)
    .bind(chunk_index)
    .bind(checksum)
    .execute(pool)
    .await?
    .rows_affected();
    Ok(rows > 0)
}

/// 更新会话状态为完成，并标记最新更新时间
pub async fn complete_session(pool: &SqlitePool, session_id: &str) -> Result<()> {
    sqlx::query(
        r#"
        UPDATE sync_sessions SET status = 'completed' WHERE session_id = ?1
        "#,
    )
    .bind(session_id)
    .execute(pool)
    .await?;
    Ok(())
}

/// 检查会话是否存在且未过期
pub async fn ensure_session_active(
    pool: &SqlitePool,
    session_id: &str,
) -> Result<SyncSessionEntity> {
    let now = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let row = sqlx::query_as::<_, SyncSessionEntity>(
        r#"
        SELECT session_id, user_uuid, last_synced_rev, created_at, updated_at, expires_at, status, chunk_counts
        FROM sync_sessions
        WHERE session_id = ?1 AND status = 'active' AND expires_at > ?2
        "#,
    )
    .bind(session_id)
    .bind(now)
    .fetch_one(pool)
    .await?;
    Ok(row)
}

fn data_type_as_str(data_type: &DataType) -> String {
    format!("{:?}", data_type)
}
