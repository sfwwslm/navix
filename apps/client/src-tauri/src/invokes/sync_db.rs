use crate::db::error::DbError;
use crate::db::pool::DbPool;
use crate::db::repo::sync_read_repo;
use serde::{Deserialize, Serialize};
use shared_rs::dto::api::ApiResponse;
use tauri::State;

#[derive(Debug, Deserialize)]
pub struct CreateSyncLogPayload {
    pub session_id: String,
    pub user_uuid: String,
}

#[derive(Debug, Deserialize)]
pub struct FinalizeSyncLogPayload {
    pub session_id: String,
    pub status: String,
    pub summary: Option<String>,
    pub error_text: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UserUuidPayload {
    pub user_uuid: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncDataCollection {
    pub website_groups: Vec<serde_json::Value>,
    pub websites: Vec<serde_json::Value>,
    pub search_engines: Vec<serde_json::Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LastSyncRevisionData {
    pub last_synced_rev: i64,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn create_sync_log_record(
    db_pool: State<'_, DbPool>,
    payload: CreateSyncLogPayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    sync_read_repo::create_sync_log(&db_pool.0, &payload.session_id, &payload.user_uuid)
        .await
        .map(|_| ApiResponse::ok("sync log created"))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn finalize_sync_log_record(
    db_pool: State<'_, DbPool>,
    payload: FinalizeSyncLogPayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    sync_read_repo::finalize_sync_log(
        &db_pool.0,
        &payload.session_id,
        &payload.status,
        payload.summary.as_deref(),
        payload.error_text.as_deref(),
    )
    .await
    .map(|_| ApiResponse::ok("sync log finalized"))
    .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn collect_local_sync_data(
    db_pool: State<'_, DbPool>,
    payload: UserUuidPayload,
) -> Result<ApiResponse<SyncDataCollection>, ApiResponse<()>> {
    sync_read_repo::collect_local_sync_data(&db_pool.0, &payload.user_uuid)
        .await
        .map(|data| {
            ApiResponse::success(
                "local sync data collected",
                SyncDataCollection {
                    website_groups: data.website_groups,
                    websites: data.websites,
                    search_engines: data.search_engines,
                },
            )
        })
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_last_sync_revision_record(
    db_pool: State<'_, DbPool>,
    payload: UserUuidPayload,
) -> Result<ApiResponse<LastSyncRevisionData>, ApiResponse<()>> {
    sync_read_repo::get_last_sync_revision(&db_pool.0, &payload.user_uuid)
        .await
        .map(|last_synced_rev| {
            ApiResponse::success(
                "last sync revision loaded",
                LastSyncRevisionData { last_synced_rev },
            )
        })
        .map_err(DbError::into_response)
}
