use crate::db::error::DbError;
use crate::db::pool::DbPool;
use crate::db::repo::claim_repo;
use serde::Deserialize;
use shared_rs::dto::api::ApiResponse;
use tauri::State;

#[derive(Debug, Deserialize)]
pub struct ReassignAnonymousDataPayload {
    pub real_user_uuid: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn reassign_anonymous_data_to_user(
    db_pool: State<'_, DbPool>,
    payload: ReassignAnonymousDataPayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    claim_repo::reassign_anonymous_data_to_user(&db_pool.0, &payload.real_user_uuid)
        .await
        .map(|_| ApiResponse::ok("anonymous data reassigned"))
        .map_err(DbError::into_response)
}
