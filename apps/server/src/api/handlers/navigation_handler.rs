//! 导航数据读取与站点管理 handler。

use crate::api::handlers::user_handler::ValidatedJson;
use crate::api::response::ApiResponse;
use crate::api::routes::AppState;
use crate::api::routes::jwt::Claims;
use crate::error::ApiResult;
use crate::models::website::{NavigationGroup, UpdateWebsitePayload};
use crate::services::navigation_service;
use axum::extract::Path;
use axum::extract::State;
use axum::response::IntoResponse;
use std::sync::Arc;

/// 获取当前登录用户的导航数据
pub async fn get_navigation_handler(
    claims: Claims,
    State(state): State<Arc<AppState>>,
) -> ApiResult<ApiResponse<Vec<NavigationGroup>>> {
    let groups = navigation_service::fetch_navigation_for_user(&state.pool, &claims.sub).await?;
    Ok(ApiResponse::success_with_raw("导航数据获取成功", groups))
}

/// 更新当前登录用户的单个导航站点。
pub async fn update_navigation_item_handler(
    claims: Claims,
    State(state): State<Arc<AppState>>,
    Path(website_uuid): Path<String>,
    ValidatedJson(payload): ValidatedJson<UpdateWebsitePayload>,
) -> ApiResult<impl IntoResponse> {
    // 站点级写接口保持极薄，字段校验和资源归属判断都下沉到 service，
    // handler 只负责把“当前登录用户”上下文注入进去。
    navigation_service::update_website_for_user(&state.pool, &claims.sub, &website_uuid, &payload)
        .await?;

    Ok(ApiResponse::ok("站点更新成功"))
}

/// 删除当前登录用户的单个导航站点。
pub async fn delete_navigation_item_handler(
    claims: Claims,
    State(state): State<Arc<AppState>>,
    Path(website_uuid): Path<String>,
) -> ApiResult<impl IntoResponse> {
    // 删除接口与更新接口共用同一套“当前用户只能操作自己的导航数据”边界。
    navigation_service::delete_website_for_user(&state.pool, &claims.sub, &website_uuid).await?;
    Ok(ApiResponse::ok("站点删除成功"))
}
