//! 用户相关 handler 与统一入参校验提取器。

use crate::api::response::ApiResponse;
use crate::{
    api::routes::jwt::Claims,
    error::{ApiError, ApiResult},
    models::user::{ChangePasswordPayload, CreateUserPayload, UpdateUsernamePayload},
    services::user_service,
};

use axum::{
    Json,
    extract::{FromRequest, Request, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};

use crate::api::routes::AppState;
use std::sync::Arc;

/// 带字段校验的 JSON 提取器。
pub struct ValidatedJson<T>(pub T);

impl<T, S> FromRequest<S> for ValidatedJson<T>
where
    T: serde::de::DeserializeOwned + FieldValidatable,
    S: Send + Sync,
{
    type Rejection = ApiError;

    /// 先反序列化 JSON，再执行字段级校验。
    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        let Json(value) = Json::<T>::from_request(req, state)
            .await
            .map_err(|e| ApiError::Internal(e.to_string()))?;

        let details = value.validate_fields();
        if !details.is_empty() {
            return Err(ApiError::ValidationDetails(details));
        }

        Ok(ValidatedJson(value))
    }
}

/// 字段级校验能力抽象。
pub trait FieldValidatable {
    fn validate_fields(&self) -> shared_rs::dto::api::ValidationDetails;
}

#[derive(serde::Serialize)]
struct BootstrapStatusPayload {
    initialized: bool,
}

impl FieldValidatable for CreateUserPayload {
    fn validate_fields(&self) -> shared_rs::dto::api::ValidationDetails {
        CreateUserPayload::validate_fields(self)
    }
}

impl FieldValidatable for UpdateUsernamePayload {
    fn validate_fields(&self) -> shared_rs::dto::api::ValidationDetails {
        UpdateUsernamePayload::validate_fields(self)
    }
}

/// 查询系统是否已完成管理员初始化。
pub async fn bootstrap_status_handler(State(state): State<Arc<AppState>>) -> ApiResult<Response> {
    let initialized = user_service::is_bootstrap_initialized(&state.pool).await?;
    Ok(
        ApiResponse::success_with_raw("初始化状态获取成功", BootstrapStatusPayload { initialized })
            .into_response(),
    )
}

/// 首次部署时初始化唯一管理员账号。
pub async fn bootstrap_init_handler(
    State(state): State<Arc<AppState>>,
    ValidatedJson(payload): ValidatedJson<CreateUserPayload>,
) -> ApiResult<Response> {
    let user = user_service::bootstrap_admin(&state.pool, &payload).await?;
    tracing::info!("管理员初始化成功: {:?}", user);

    Ok(ApiResponse::success_msg(
        "管理员初始化成功，请使用该账号登录",
        StatusCode::CREATED.as_u16(),
    )
    .into_response())
}

/// 修改当前用户密码。
pub async fn change_password_handler(
    claims: Claims,
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ChangePasswordPayload>,
) -> ApiResult<Response> {
    let details = payload.validate_fields();
    if !details.is_empty() {
        return Err(ApiError::ValidationDetails(details));
    }

    user_service::change_user_password(&state.pool, claims, &payload).await?;
    Ok(ApiResponse::ok("密码更新成功").into_response())
}

/// 修改当前用户用户名。
pub async fn change_username_handler(
    State(state): State<Arc<AppState>>,
    claims: Claims,
    ValidatedJson(payload): ValidatedJson<UpdateUsernamePayload>,
) -> ApiResult<Response> {
    user_service::change_username(&state.pool, claims, &payload).await?;
    Ok(ApiResponse::ok("用户名更新成功").into_response())
}
