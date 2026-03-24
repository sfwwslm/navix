use crate::api::response::ApiResponse;
use crate::api::routes::AppState;
use crate::api::routes::jwt::Claims;
use crate::error::ApiResult;
use crate::models::website::NavigationGroup;
use crate::services::navigation_service;
use axum::extract::State;
use std::sync::Arc;

/// 获取当前登录用户的导航数据
pub async fn get_navigation_handler(
    claims: Claims,
    State(state): State<Arc<AppState>>,
) -> ApiResult<ApiResponse<Vec<NavigationGroup>>> {
    let groups = navigation_service::fetch_navigation_for_user(&state.pool, &claims.sub).await?;
    Ok(ApiResponse::success_with_raw("导航数据获取成功", groups))
}
