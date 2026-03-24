use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncSessionEntity {
    pub session_id: String,
    pub user_uuid: String,
    pub last_synced_rev: i64,
    pub created_at: String,
    pub updated_at: String,
    pub expires_at: String,
    pub status: String,
    pub chunk_counts: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncChunkEntity {
    pub id: i64,
    pub session_id: String,
    pub data_type: String,
    pub chunk_index: i64,
    pub checksum: String,
    pub created_at: String,
}
