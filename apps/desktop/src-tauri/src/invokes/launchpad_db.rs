use crate::db::error::DbError;
use crate::db::pool::DbPool;
use crate::db::repo::launchpad_repo::{
    self, DefaultWebsiteGroupInput, SaveGroupInput, SaveItemInput, SaveSearchEngineInput,
};
use serde::{Deserialize, Serialize};
use shared_rs::dto::api::ApiResponse;
use tauri::State;

#[derive(Debug, Deserialize)]
pub struct OrderPayload {
    pub uuids: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct DeleteGroupPayload {
    pub group_uuid: String,
}

#[derive(Debug, Deserialize)]
pub struct DeleteItemPayload {
    pub item_uuid: String,
}

#[derive(Debug, Deserialize)]
pub struct DeleteSearchEnginePayload {
    pub uuid: String,
}

#[derive(Debug, Deserialize)]
pub struct SetActiveSearchEnginePayload {
    pub engine_uuid: String,
    pub user_uuid: String,
}

#[derive(Debug, Deserialize)]
pub struct ClearDefaultSearchEnginePayload {
    pub user_uuid: String,
}

#[derive(Debug, Deserialize)]
pub struct EnsureDefaultLaunchpadPayload {
    pub user_uuid: String,
    pub groups: Vec<DefaultWebsiteGroupInput>,
}

#[derive(Debug, Deserialize)]
pub struct UserUuidPayload {
    pub user_uuid: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchpadData {
    pub groups: Vec<serde_json::Value>,
    pub items: Vec<serde_json::Value>,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_launchpad_data_record(
    db_pool: State<'_, DbPool>,
    payload: UserUuidPayload,
) -> Result<ApiResponse<LaunchpadData>, ApiResponse<()>> {
    let groups = launchpad_repo::get_launchpad_groups(&db_pool.0, &payload.user_uuid).await;
    let items = launchpad_repo::get_launchpad_items(&db_pool.0, &payload.user_uuid).await;

    match (groups, items) {
        (Ok(groups), Ok(items)) => Ok(ApiResponse::success(
            "launchpad data loaded",
            LaunchpadData { groups, items },
        )),
        (Err(err), _) | (_, Err(err)) => Err(err.into_response()),
    }
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_search_engines_record(
    db_pool: State<'_, DbPool>,
    payload: UserUuidPayload,
) -> Result<ApiResponse<Vec<serde_json::Value>>, ApiResponse<()>> {
    launchpad_repo::get_search_engines(&db_pool.0, &payload.user_uuid)
        .await
        .map(|data| ApiResponse::success("search engines loaded", data))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_default_search_engine_record(
    db_pool: State<'_, DbPool>,
    payload: UserUuidPayload,
) -> Result<ApiResponse<Option<serde_json::Value>>, ApiResponse<()>> {
    launchpad_repo::get_default_search_engine(&db_pool.0, &payload.user_uuid)
        .await
        .map(|data| ApiResponse::success("default search engine loaded", data))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn save_website_group(
    db_pool: State<'_, DbPool>,
    payload: SaveGroupInput,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    launchpad_repo::save_group(&db_pool.0, &payload)
        .await
        .map(|_| ApiResponse::ok("group saved"))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_website_groups_order(
    db_pool: State<'_, DbPool>,
    payload: OrderPayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    launchpad_repo::update_groups_order(&db_pool.0, &payload.uuids)
        .await
        .map(|_| ApiResponse::ok("group order updated"))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_website_group(
    db_pool: State<'_, DbPool>,
    payload: DeleteGroupPayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    launchpad_repo::delete_group(&db_pool.0, &payload.group_uuid)
        .await
        .map(|_| ApiResponse::ok("group deleted"))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn save_website_item(
    db_pool: State<'_, DbPool>,
    payload: SaveItemInput,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    launchpad_repo::save_item(&db_pool.0, &payload)
        .await
        .map(|_| ApiResponse::ok("item saved"))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_website_items_order(
    db_pool: State<'_, DbPool>,
    payload: OrderPayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    launchpad_repo::update_items_order(&db_pool.0, &payload.uuids)
        .await
        .map(|_| ApiResponse::ok("item order updated"))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_website_item(
    db_pool: State<'_, DbPool>,
    payload: DeleteItemPayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    launchpad_repo::delete_item(&db_pool.0, &payload.item_uuid)
        .await
        .map(|_| ApiResponse::ok("item deleted"))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn ensure_default_launchpad_data(
    db_pool: State<'_, DbPool>,
    payload: EnsureDefaultLaunchpadPayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    launchpad_repo::ensure_default_data(&db_pool.0, &payload.user_uuid, &payload.groups)
        .await
        .map(|_| ApiResponse::ok("default launchpad data ensured"))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn save_search_engine_record(
    db_pool: State<'_, DbPool>,
    payload: SaveSearchEngineInput,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    launchpad_repo::save_search_engine(&db_pool.0, &payload)
        .await
        .map(|_| ApiResponse::ok("search engine saved"))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn set_active_search_engine_record(
    db_pool: State<'_, DbPool>,
    payload: SetActiveSearchEnginePayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    launchpad_repo::set_active_search_engine(&db_pool.0, &payload.engine_uuid, &payload.user_uuid)
        .await
        .map(|_| ApiResponse::ok("search engine activated"))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn clear_default_search_engine_record(
    db_pool: State<'_, DbPool>,
    payload: ClearDefaultSearchEnginePayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    launchpad_repo::clear_default_search_engine(&db_pool.0, &payload.user_uuid)
        .await
        .map(|_| ApiResponse::ok("default search engine cleared"))
        .map_err(DbError::into_response)
}

#[tauri::command(rename_all = "snake_case")]
pub async fn delete_search_engine_record(
    db_pool: State<'_, DbPool>,
    payload: DeleteSearchEnginePayload,
) -> Result<ApiResponse<()>, ApiResponse<()>> {
    launchpad_repo::delete_search_engine(&db_pool.0, &payload.uuid)
        .await
        .map(|_| ApiResponse::ok("search engine deleted"))
        .map_err(DbError::into_response)
}
