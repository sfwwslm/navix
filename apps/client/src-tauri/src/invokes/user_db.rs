use crate::db::error::DbError;
use crate::db::pool::DbPool;
use crate::db::repo::user_repo::{self, SaveUserInput};
use serde::Deserialize;
use shared_rs::dto::api::ApiResponse;
use tauri::State;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveUserPayload {
    pub uuid: String,
    pub username: String,
    pub server_address: Option<String>,
    pub server_instance_uuid: Option<String>,
    pub token: Option<String>,
    pub refresh_token: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUsernamePayload {
    pub uuid: String,
    pub new_username: String,
}

#[derive(Debug, Deserialize)]
pub struct SetLoginStatusPayload {
    pub uuid: String,
    pub is_logged_in: bool,
}

#[derive(Debug, Deserialize)]
pub struct UpdateServerAddressPayload {
    pub uuid: String,
    pub server_address: String,
}

#[derive(Debug, Deserialize)]
pub struct DeleteUserPayload {
    pub user_uuid: String,
}

#[tauri::command]
pub async fn get_all_users_record(
    db_pool: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<serde_json::Value>>, ApiResponse<()>> {
    user_repo::get_all_users(&db_pool.0)
        .await
        .map(|data| ApiResponse::success("users loaded", data))
        .map_err(DbError::into_response)
}

#[tauri::command]
pub async fn get_used_icon_names_record(
    db_pool: State<'_, DbPool>,
) -> Result<ApiResponse<Vec<String>>, ApiResponse<()>> {
    user_repo::get_used_icon_names(&db_pool.0)
        .await
        .map(|data| ApiResponse::success("used icon names loaded", data))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn save_user_record(
    db_pool: State<'_, DbPool>,
    payload: SaveUserPayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    let user = SaveUserInput {
        uuid: payload.uuid,
        username: payload.username,
        server_address: payload.server_address,
        server_instance_uuid: payload.server_instance_uuid,
        token: payload.token,
        refresh_token: payload.refresh_token,
    };

    user_repo::save_user(&db_pool.0, &user)
        .await
        .map(|_| ApiResponse::ok("user saved"))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_username_record(
    db_pool: State<'_, DbPool>,
    payload: UpdateUsernamePayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    user_repo::update_username(&db_pool.0, &payload.uuid, &payload.new_username)
        .await
        .map(|_| ApiResponse::ok("username updated"))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn set_user_login_status(
    db_pool: State<'_, DbPool>,
    payload: SetLoginStatusPayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    user_repo::set_login_status(&db_pool.0, &payload.uuid, payload.is_logged_in)
        .await
        .map(|_| ApiResponse::ok("login status updated"))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_user_server_address(
    db_pool: State<'_, DbPool>,
    payload: UpdateServerAddressPayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    user_repo::update_server_address(&db_pool.0, &payload.uuid, &payload.server_address)
        .await
        .map(|_| ApiResponse::ok("server address updated"))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_user_with_data_record(
    db_pool: State<'_, DbPool>,
    payload: DeleteUserPayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    user_repo::delete_user_with_data(&db_pool.0, &payload.user_uuid)
        .await
        .map(|rows| {
            if rows == 0 {
                ApiResponse::fail("未找到要删除的用户，可能已被移除。")
            } else {
                ApiResponse::ok("user deleted")
            }
        })
        .map_err(DbError::into_response)
}
