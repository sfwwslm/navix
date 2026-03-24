use crate::{
    api::handlers::user_handler::ValidatedJson, api::response::ApiResponse, api::routes::AppState,
    api::routes::jwt::Claims, error::ApiResult, models::user::CreateUserPayload,
    services::admin_service,
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use std::sync::Arc;

/// 管理员新增普通用户。
pub async fn create_user_handler(
    claims: Claims,
    State(state): State<Arc<AppState>>,
    ValidatedJson(payload): ValidatedJson<CreateUserPayload>,
) -> ApiResult<Response> {
    let user = admin_service::create_user(&state.pool, &payload, &claims).await?;
    Ok(
        ApiResponse::success_with_status("用户创建成功", user, StatusCode::CREATED.as_u16())
            .into_response(),
    )
}

pub async fn list_users_handler(
    _claims: Claims,
    State(state): State<Arc<AppState>>,
) -> ApiResult<Response> {
    let data = admin_service::list_users(&state.pool).await?;
    Ok(ApiResponse::success_with_raw("获取用户列表成功", data).into_response())
}

pub async fn disable_user_handler(
    claims: Claims,
    State(state): State<Arc<AppState>>,
    Path(user_uuid): Path<String>,
) -> ApiResult<Response> {
    admin_service::disable_user(&state.pool, &user_uuid, true, &claims).await?;
    Ok(ApiResponse::ok("用户已禁用").into_response())
}

pub async fn enable_user_handler(
    claims: Claims,
    State(state): State<Arc<AppState>>,
    Path(user_uuid): Path<String>,
) -> ApiResult<Response> {
    admin_service::disable_user(&state.pool, &user_uuid, false, &claims).await?;
    Ok(ApiResponse::ok("用户已启用").into_response())
}

pub async fn delete_user_handler(
    claims: Claims,
    State(state): State<Arc<AppState>>,
    Path(user_uuid): Path<String>,
) -> ApiResult<Response> {
    let summary = admin_service::soft_delete_user(&state.pool, &user_uuid, &claims).await?;
    Ok(ApiResponse::success_with_raw("用户已删除并清理数据", summary).into_response())
}

pub async fn cleanup_user_handler(
    claims: Claims,
    State(state): State<Arc<AppState>>,
    Path(user_uuid): Path<String>,
) -> ApiResult<Response> {
    let summary = admin_service::cleanup_user(&state.pool, &user_uuid, &claims).await?;
    Ok(ApiResponse::success_with_raw("用户数据已清理", summary).into_response())
}
