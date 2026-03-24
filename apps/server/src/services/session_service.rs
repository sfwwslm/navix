use crate::api::routes::AppState;
use crate::{
    api::response::ApiResponse,
    api::routes::jwt::Claims,
    app_config::APP_CONFIG,
    error::{ApiError, ApiResult},
    models::user::CurrentUserPayload,
    observability::{build_server_record, emit_json_log, string_payload},
    services::user_service,
};
use axum::{
    Json,
    extract::State,
    response::{IntoResponse, Response},
};
use semver::Version;
use shadow_rs::shadow;
use shared_rs::dto::telemetry::{LogLevel, ObservabilityEvent, TelemetryResultStatus};
use shared_rs::dto::version::{ClientCompatibilityRequest, CompatibilityInfo, VersionInfo};
use std::sync::Arc;

shadow!(build);

pub async fn welcome(claims: Claims) -> ApiResult<Response> {
    Ok(ApiResponse::success_with_raw("welcome", claims).into_response())
}

/// 返回应用的构建版本信息
pub async fn get_version_info() -> ApiResult<Response> {
    let version_info = VersionInfo {
        version: build::PKG_VERSION.to_string(),
        commit_hash: build::SHORT_COMMIT.to_string(),
        build_time: build::BUILD_TIME.to_string(),
        build_env: format!("{},{}", build::RUST_VERSION, build::RUST_CHANNEL),
    };
    Ok(ApiResponse::success_with_raw("版本信息获取成功", version_info).into_response())
}

fn build_compatibility_info() -> CompatibilityInfo {
    CompatibilityInfo {
        server_version: build::PKG_VERSION.to_string(),
        min_client_version: APP_CONFIG.compat.min_client_version.to_string(),
        recommended_client_version: APP_CONFIG.compat.recommended_client_version.to_string(),
        sync_protocol_current: APP_CONFIG.compat.sync_protocol_current,
        sync_protocol_min_client: APP_CONFIG.compat.sync_protocol_min_client,
    }
}

/// 1. 验证客户端 Token 是否合法
///
/// 2. 使用 Token 中的 UUID 从数据库查询最新的用户信息
pub async fn check_auth_status_handler(
    claims: Claims,
    State(state): State<Arc<AppState>>,
) -> ApiResult<Response> {
    let user = user_service::get_user_by_uuid(&state.pool, &claims.sub)
        .await?
        .ok_or(ApiError::UserNotFound)?;

    if user.deleted_at.is_some() {
        return Err(ApiError::UserDeleted);
    }
    if user.disabled_at.is_some() {
        return Err(ApiError::UserDisabled);
    }

    let user = CurrentUserPayload {
        username: user.username,
        uuid: user.uuid,
        role: user.role,
        disabled_at: user.disabled_at,
        deleted_at: user.deleted_at,
    };

    Ok(ApiResponse::success_with_raw("认证通过将返回最新用户的数据！", user).into_response())
}

/// 处理客户端兼容性检查请求（公开接口）。
pub async fn check_compatibility_handler(
    Json(payload): Json<ClientCompatibilityRequest>,
) -> ApiResult<Response> {
    let compatibility = build_compatibility_info();
    if APP_CONFIG.observability.emit_compat_audit_log {
        let mut record = build_server_record(
            ObservabilityEvent::SyncCompatCheckStarted,
            LogLevel::Info,
            build::PKG_VERSION,
        );
        record.context.route = Some("POST /api/compat".to_string());
        record.payload = Some(string_payload(std::collections::BTreeMap::from([
            ("client_version".to_string(), payload.app_version.clone()),
            (
                "client_protocol".to_string(),
                payload.sync_protocol.to_string(),
            ),
            (
                "server_version".to_string(),
                compatibility.server_version.clone(),
            ),
            (
                "operation".to_string(),
                "check_compatibility_handler".to_string(),
            ),
            ("module".to_string(), "session_service".to_string()),
        ])));
        emit_json_log(record);
    }

    let min_version = Version::parse(APP_CONFIG.compat.min_client_version).unwrap();
    let client_version = Version::parse(&payload.app_version)
        .map_err(|_| ApiError::BadRequest("客户端版本号格式不正确".to_string()))?;

    if payload.sync_protocol < APP_CONFIG.compat.sync_protocol_min_client {
        if APP_CONFIG.observability.emit_compat_audit_log {
            let mut record = build_server_record(
                ObservabilityEvent::SyncCompatCheckBlocked,
                LogLevel::Warn,
                build::PKG_VERSION,
            );
            record.context.route = Some("POST /api/compat".to_string());
            record.result.status = TelemetryResultStatus::Fail.as_str().to_string();
            record.result.error_code = Some("SYNC.PROTOCOL_MISMATCH".to_string());
            record.result.error_message = Some("sync protocol too old".to_string());
            record.payload = Some(string_payload(std::collections::BTreeMap::from([
                (
                    "client_protocol".to_string(),
                    payload.sync_protocol.to_string(),
                ),
                (
                    "min_client_protocol".to_string(),
                    APP_CONFIG.compat.sync_protocol_min_client.to_string(),
                ),
                ("reason".to_string(), "sync_protocol_too_old".to_string()),
                (
                    "operation".to_string(),
                    "check_compatibility_handler".to_string(),
                ),
                ("module".to_string(), "session_service".to_string()),
            ])));
            emit_json_log(record);
        }
        return Err(ApiError::SyncProtocolMismatch(format!(
            "minimum protocol required: v{}",
            APP_CONFIG.compat.sync_protocol_min_client
        )));
    }

    if client_version < min_version {
        if APP_CONFIG.observability.emit_compat_audit_log {
            let mut record = build_server_record(
                ObservabilityEvent::SyncCompatCheckBlocked,
                LogLevel::Warn,
                build::PKG_VERSION,
            );
            record.context.route = Some("POST /api/compat".to_string());
            record.result.status = TelemetryResultStatus::Fail.as_str().to_string();
            record.result.error_code = Some("SYNC.CLIENT_VERSION_MISMATCH".to_string());
            record.result.error_message = Some("client version too old".to_string());
            record.payload = Some(string_payload(std::collections::BTreeMap::from([
                ("client_version".to_string(), payload.app_version.clone()),
                (
                    "min_client_version".to_string(),
                    APP_CONFIG.compat.min_client_version.to_string(),
                ),
                ("reason".to_string(), "client_version_too_old".to_string()),
                (
                    "operation".to_string(),
                    "check_compatibility_handler".to_string(),
                ),
                ("module".to_string(), "session_service".to_string()),
            ])));
            emit_json_log(record);
        }
        return Err(ApiError::ClientVersionMismatch(format!(
            "minimum client version required: v{}",
            APP_CONFIG.compat.min_client_version
        )));
    }

    if APP_CONFIG.observability.emit_compat_audit_log {
        let mut record = build_server_record(
            ObservabilityEvent::SyncCompatCheckPassed,
            LogLevel::Info,
            build::PKG_VERSION,
        );
        record.context.route = Some("POST /api/compat".to_string());
        record.payload = Some(string_payload(std::collections::BTreeMap::from([
            ("client_version".to_string(), payload.app_version.clone()),
            (
                "client_protocol".to_string(),
                payload.sync_protocol.to_string(),
            ),
            (
                "operation".to_string(),
                "check_compatibility_handler".to_string(),
            ),
            ("module".to_string(), "session_service".to_string()),
        ])));
        emit_json_log(record);
    }

    Ok(ApiResponse::success_with_raw("兼容性验证通过，可以同步", compatibility).into_response())
}
