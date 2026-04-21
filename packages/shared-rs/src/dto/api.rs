//! 统一 API 响应与错误码定义。
//! 该模块在 server/client/tauri/web 之间共享，保证链路上的错误语义一致。

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// 字段级校验详情。
/// key 为字段名，value 为该字段触发的稳定校验码列表。
pub type ValidationDetails = BTreeMap<String, Vec<String>>;

/// 全链路统一业务错误码。
#[derive(Debug, Clone, Copy, Serialize, Deserialize, Eq, PartialEq, Hash)]
pub enum AppErrorCode {
    #[serde(rename = "AUTH.WRONG_CREDENTIALS")]
    AuthWrongCredentials,
    #[serde(rename = "AUTH.USER_NOT_FOUND")]
    AuthUserNotFound,
    #[serde(rename = "AUTH.USER_DISABLED")]
    AuthUserDisabled,
    #[serde(rename = "AUTH.USER_DELETED")]
    AuthUserDeleted,
    #[serde(rename = "AUTH.MISSING_CREDENTIALS")]
    AuthMissingCredentials,
    #[serde(rename = "AUTH.TOKEN_INVALID")]
    AuthTokenInvalid,
    #[serde(rename = "AUTH.TOKEN_EXPIRED")]
    AuthTokenExpired,
    #[serde(rename = "AUTH.TOKEN_CREATION_FAILED")]
    AuthTokenCreationFailed,

    #[serde(rename = "USER.USERNAME_EXISTS")]
    UserUsernameExists,
    #[serde(rename = "USER.WRONG_OLD_PASSWORD")]
    UserWrongOldPassword,
    #[serde(rename = "USER.INVALID_PASSWORD")]
    UserInvalidPassword,

    #[serde(rename = "SYNC.CLIENT_VERSION_MISMATCH")]
    SyncClientVersionMismatch,
    #[serde(rename = "SYNC.PROTOCOL_MISMATCH")]
    SyncProtocolMismatch,
    #[serde(rename = "SYNC.SESSION_INVALID")]
    SyncSessionInvalid,

    #[serde(rename = "RESOURCE.FORBIDDEN")]
    ResourceForbidden,
    #[serde(rename = "RESOURCE.NOT_FOUND")]
    ResourceNotFound,

    #[serde(rename = "REQUEST.BAD_REQUEST")]
    RequestBadRequest,
    #[serde(rename = "REQUEST.VALIDATION_FAILED")]
    RequestValidationFailed,

    #[serde(rename = "INTERNAL.SERVER_ERROR")]
    InternalServerError,
    #[serde(rename = "INTERNAL.DB_ERROR")]
    InternalDbError,
    #[serde(rename = "INTERNAL.IO_ERROR")]
    InternalIoError,
    #[serde(rename = "NETWORK.REQUEST_FAILED")]
    NetworkRequestFailed,
    #[serde(rename = "REQUEST.TIMEOUT")]
    RequestTimeout,
    #[serde(rename = "TAURI.INVOKE_FAILED")]
    TauriInvokeFailed,
    #[serde(rename = "CLIENT.UNEXPECTED_ERROR")]
    ClientUnexpectedError,
}

impl AppErrorCode {
    /// 返回错误码的稳定字符串表示。
    pub fn as_str(self) -> &'static str {
        match self {
            Self::AuthWrongCredentials => "AUTH.WRONG_CREDENTIALS",
            Self::AuthUserNotFound => "AUTH.USER_NOT_FOUND",
            Self::AuthUserDisabled => "AUTH.USER_DISABLED",
            Self::AuthUserDeleted => "AUTH.USER_DELETED",
            Self::AuthMissingCredentials => "AUTH.MISSING_CREDENTIALS",
            Self::AuthTokenInvalid => "AUTH.TOKEN_INVALID",
            Self::AuthTokenExpired => "AUTH.TOKEN_EXPIRED",
            Self::AuthTokenCreationFailed => "AUTH.TOKEN_CREATION_FAILED",
            Self::UserUsernameExists => "USER.USERNAME_EXISTS",
            Self::UserWrongOldPassword => "USER.WRONG_OLD_PASSWORD",
            Self::UserInvalidPassword => "USER.INVALID_PASSWORD",
            Self::SyncClientVersionMismatch => "SYNC.CLIENT_VERSION_MISMATCH",
            Self::SyncProtocolMismatch => "SYNC.PROTOCOL_MISMATCH",
            Self::SyncSessionInvalid => "SYNC.SESSION_INVALID",
            Self::ResourceForbidden => "RESOURCE.FORBIDDEN",
            Self::ResourceNotFound => "RESOURCE.NOT_FOUND",
            Self::RequestBadRequest => "REQUEST.BAD_REQUEST",
            Self::RequestValidationFailed => "REQUEST.VALIDATION_FAILED",
            Self::InternalServerError => "INTERNAL.SERVER_ERROR",
            Self::InternalDbError => "INTERNAL.DB_ERROR",
            Self::InternalIoError => "INTERNAL.IO_ERROR",
            Self::NetworkRequestFailed => "NETWORK.REQUEST_FAILED",
            Self::RequestTimeout => "REQUEST.TIMEOUT",
            Self::TauriInvokeFailed => "TAURI.INVOKE_FAILED",
            Self::ClientUnexpectedError => "CLIENT.UNEXPECTED_ERROR",
        }
    }

    /// 返回统一错误分类，供服务端响应和客户端异常统一使用。
    pub fn category(self) -> AppErrorCategory {
        match self {
            Self::AuthWrongCredentials
            | Self::AuthUserNotFound
            | Self::AuthUserDisabled
            | Self::AuthUserDeleted
            | Self::AuthMissingCredentials
            | Self::AuthTokenInvalid
            | Self::AuthTokenExpired
            | Self::AuthTokenCreationFailed => AppErrorCategory::Auth,
            Self::UserUsernameExists | Self::UserWrongOldPassword | Self::UserInvalidPassword => {
                AppErrorCategory::User
            }
            Self::SyncClientVersionMismatch
            | Self::SyncProtocolMismatch
            | Self::SyncSessionInvalid => AppErrorCategory::Sync,
            Self::ResourceForbidden => AppErrorCategory::Permission,
            Self::ResourceNotFound => AppErrorCategory::NotFound,
            Self::RequestValidationFailed => AppErrorCategory::Validation,
            Self::RequestBadRequest => AppErrorCategory::Request,
            Self::InternalServerError | Self::InternalDbError | Self::InternalIoError => {
                AppErrorCategory::Internal
            }
            Self::NetworkRequestFailed => AppErrorCategory::Network,
            Self::RequestTimeout => AppErrorCategory::Timeout,
            Self::TauriInvokeFailed | Self::ClientUnexpectedError => AppErrorCategory::Client,
        }
    }

    /// 标记该错误是否适合自动重试。
    pub fn retryable(self) -> bool {
        matches!(
            self,
            Self::InternalServerError
                | Self::InternalDbError
                | Self::InternalIoError
                | Self::NetworkRequestFailed
                | Self::RequestTimeout
        )
    }
}

/// 全链路统一错误分类。
#[derive(Debug, Clone, Copy, Serialize, Deserialize, Eq, PartialEq, Hash)]
pub enum AppErrorCategory {
    #[serde(rename = "auth")]
    Auth,
    #[serde(rename = "user")]
    User,
    #[serde(rename = "sync")]
    Sync,
    #[serde(rename = "permission")]
    Permission,
    #[serde(rename = "validation")]
    Validation,
    #[serde(rename = "request")]
    Request,
    #[serde(rename = "not_found")]
    NotFound,
    #[serde(rename = "network")]
    Network,
    #[serde(rename = "timeout")]
    Timeout,
    #[serde(rename = "internal")]
    Internal,
    #[serde(rename = "client")]
    Client,
}

/// 统一错误载荷，失败响应和客户端抛错都复用该结构。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppErrorPayload {
    pub code: AppErrorCode,
    pub message: String,
    pub category: AppErrorCategory,
    pub retryable: bool,
    pub http_status: u16,
    pub details: Option<ValidationDetails>,
    pub trace_id: Option<String>,
}

impl AppErrorPayload {
    pub fn new(code: AppErrorCode, message: impl Into<String>, http_status: u16) -> Self {
        Self {
            code,
            message: message.into(),
            category: code.category(),
            retryable: code.retryable(),
            http_status,
            details: None,
            trace_id: None,
        }
    }

    pub fn with_details(mut self, details: Option<ValidationDetails>) -> Self {
        self.details = details;
        self
    }

    pub fn with_trace_id(mut self, trace_id: impl Into<String>) -> Self {
        self.trace_id = Some(trace_id.into());
        self
    }
}

/// 全链路统一响应信封。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub code: String,
    pub http_status: u16,
    pub message: String,
    pub data: Option<T>,
    pub details: Option<ValidationDetails>,
    pub trace_id: Option<String>,
    pub error: Option<AppErrorPayload>,
}

impl<T> ApiResponse<T> {
    /// 语义别名：返回携带数据的成功响应。
    pub fn success_with_raw(message: impl Into<String>, data: T) -> Self {
        Self::success(message, data)
    }

    /// 返回 HTTP 200 的成功响应。
    pub fn success(message: impl Into<String>, data: T) -> Self {
        Self {
            success: true,
            code: "OK".to_string(),
            http_status: 200,
            message: message.into(),
            data: Some(data),
            details: None,
            trace_id: None,
            error: None,
        }
    }

    /// 返回指定状态码的成功响应。
    pub fn success_with_status(message: impl Into<String>, data: T, http_status: u16) -> Self {
        Self {
            success: true,
            code: "OK".to_string(),
            http_status,
            message: message.into(),
            data: Some(data),
            details: None,
            trace_id: None,
            error: None,
        }
    }

    /// 返回携带统一错误码的失败响应。
    pub fn failure(
        code: AppErrorCode,
        message: impl Into<String>,
        http_status: u16,
        details: Option<ValidationDetails>,
    ) -> Self {
        let message = message.into();
        Self {
            success: false,
            code: code.as_str().to_string(),
            http_status,
            message: message.clone(),
            data: None,
            details: details.clone(),
            trace_id: None,
            error: Some(AppErrorPayload::new(code, message, http_status).with_details(details)),
        }
    }

    /// 追加链路追踪 ID。
    pub fn with_trace_id(mut self, trace_id: impl Into<String>) -> Self {
        let trace_id = trace_id.into();
        self.trace_id = Some(trace_id.clone());
        if let Some(error) = self.error.as_mut() {
            error.trace_id = Some(trace_id);
        }
        self
    }
}

impl ApiResponse<()> {
    /// 返回无 data 的成功响应（HTTP 200）。
    pub fn ok(message: impl Into<String>) -> Self {
        Self {
            success: true,
            code: "OK".to_string(),
            http_status: 200,
            message: message.into(),
            data: None,
            details: None,
            trace_id: None,
            error: None,
        }
    }

    /// 返回无 data 的失败响应（HTTP 400，通用坏请求）。
    pub fn fail(message: impl Into<String>) -> Self {
        let message = message.into();
        Self {
            success: false,
            code: AppErrorCode::RequestBadRequest.as_str().to_string(),
            http_status: 400,
            message: message.clone(),
            data: None,
            details: None,
            trace_id: None,
            error: Some(AppErrorPayload::new(
                AppErrorCode::RequestBadRequest,
                message,
                400,
            )),
        }
    }

    /// 返回无 data 的成功响应（自定义状态码）。
    pub fn success_msg(message: impl Into<String>, http_status: u16) -> Self {
        Self {
            success: true,
            code: "OK".to_string(),
            http_status,
            message: message.into(),
            data: None,
            details: None,
            trace_id: None,
            error: None,
        }
    }

    /// 返回无 data 的失败响应（自定义错误码与状态码）。
    pub fn error_msg(code: AppErrorCode, message: impl Into<String>, http_status: u16) -> Self {
        let message = message.into();
        Self {
            success: false,
            code: code.as_str().to_string(),
            http_status,
            message: message.clone(),
            data: None,
            details: None,
            trace_id: None,
            error: Some(AppErrorPayload::new(code, message, http_status)),
        }
    }

    /// 兼容旧调用签名的失败响应构造器。
    pub fn error(
        message: impl Into<String>,
        _raw_data: impl Into<String>,
        http_status: u16,
    ) -> Self {
        let message = message.into();
        Self {
            success: false,
            code: AppErrorCode::RequestBadRequest.as_str().to_string(),
            http_status,
            message: message.clone(),
            data: None,
            details: None,
            trace_id: None,
            error: Some(AppErrorPayload::new(
                AppErrorCode::RequestBadRequest,
                message,
                http_status,
            )),
        }
    }
}

#[cfg(feature = "server")]
impl<T: Serialize> axum::response::IntoResponse for ApiResponse<T> {
    /// 将统一响应信封转换为 Axum HTTP 响应。
    fn into_response(self) -> axum::response::Response {
        let status = axum::http::StatusCode::from_u16(self.http_status)
            .unwrap_or(axum::http::StatusCode::INTERNAL_SERVER_ERROR);
        (status, axum::Json(self)).into_response()
    }
}
