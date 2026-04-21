use crate::db::error::DbError;
use crate::db::pool::DbPool;
use crate::db::repo::sync_repo;
use shared_rs::dto::api::ApiResponse;
use shared_rs::dto::sync::ServerSyncData;
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use tauri::State;

#[derive(Default)]
pub struct SyncApplyLock {
    active_users: Arc<Mutex<HashSet<String>>>,
}

impl SyncApplyLock {
    fn try_acquire(&self, user_uuid: &str) -> Option<SyncApplyGuard> {
        let mut active_users = self.active_users.lock().ok()?;
        if active_users.contains(user_uuid) {
            return None;
        }

        active_users.insert(user_uuid.to_string());
        Some(SyncApplyGuard {
            user_uuid: user_uuid.to_string(),
            active_users: Arc::clone(&self.active_users),
        })
    }
}

struct SyncApplyGuard {
    user_uuid: String,
    active_users: Arc<Mutex<HashSet<String>>>,
}

impl Drop for SyncApplyGuard {
    fn drop(&mut self) {
        if let Ok(mut active_users) = self.active_users.lock() {
            active_users.remove(&self.user_uuid);
        }
    }
}

#[derive(Debug, serde::Deserialize)]
pub struct ApplySyncResultPayload {
    pub user_uuid: String,
    pub server_data: ServerSyncData,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn apply_sync_result(
    db_pool: State<'_, DbPool>,
    sync_apply_lock: State<'_, SyncApplyLock>,
    payload: ApplySyncResultPayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    let _guard = sync_apply_lock
        .try_acquire(&payload.user_uuid)
        .ok_or_else(|| DbError::Busy.into_response())?;

    sync_repo::apply_sync_result(&db_pool.0, &payload.user_uuid, &payload.server_data)
        .await
        .map(|_| ApiResponse::ok("sync result applied"))
        .map_err(DbError::into_response)
}
