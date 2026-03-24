//! 服务端统一错误定义与 HTTP 响应映射。

use crate::api::response::ApiResponse;
use axum::{
    extract::multipart::MultipartError,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use bcrypt::BcryptError;
use jsonwebtoken::errors::Error as JwtError;
use semver::Error as SemverError;
use shared_rs::dto::api::{AppErrorCode, ValidationDetails};
use validator::ValidationErrors;

/// 业务层返回类型别名。
pub type ApiResult<T> = std::result::Result<T, ApiError>;

/// 服务端业务错误枚举。
#[derive(Debug)]
pub enum ApiError {
    WrongCredentials,
    UserNotFound,
    UserDisabled,
    UserDeleted,
    MissingCredentials,
    TokenCreation,
    InvalidToken,
    TokenExpired,
    InvalidPassword,
    WrongOldPassword,
    UsernameExists,
    ClientVersionMismatch(String),
    SyncProtocolMismatch(String),
    SyncSessionInvalid(String),

    Sqlx(sqlx::Error),
    Bcrypt(BcryptError),
    Validation(ValidationErrors),
    ValidationDetails(ValidationDetails),
    Token(JwtError),

    Io(tokio::io::Error),
    Multipart(MultipartError),
    MissingFileName,
    ForbiddenResource,
    ResourceNotFound,

    Internal(String),
    ParseError(SemverError),

    BadRequest(String),
    NotFound,
}

impl IntoResponse for ApiError {
    /// 将业务错误映射为统一响应信封与 HTTP 状态码。
    fn into_response(self) -> Response {
        match self {
            ApiError::WrongCredentials => ApiResponse::error_msg(
                AppErrorCode::AuthWrongCredentials,
                "用户名或密码错误",
                StatusCode::UNAUTHORIZED.as_u16(),
            )
            .into_response(),
            ApiError::UserNotFound => ApiResponse::error_msg(
                AppErrorCode::AuthUserNotFound,
                "用户不存在",
                StatusCode::UNAUTHORIZED.as_u16(),
            )
            .into_response(),
            ApiError::UserDisabled => ApiResponse::error_msg(
                AppErrorCode::AuthUserDisabled,
                "账号已被禁用，请联系管理员",
                StatusCode::FORBIDDEN.as_u16(),
            )
            .into_response(),
            ApiError::UserDeleted => ApiResponse::error_msg(
                AppErrorCode::AuthUserDeleted,
                "账号已被删除，请联系管理员",
                StatusCode::FORBIDDEN.as_u16(),
            )
            .into_response(),
            ApiError::MissingCredentials => ApiResponse::error_msg(
                AppErrorCode::AuthMissingCredentials,
                "缺少用户名或密码",
                StatusCode::BAD_REQUEST.as_u16(),
            )
            .into_response(),
            ApiError::TokenCreation => ApiResponse::error_msg(
                AppErrorCode::AuthTokenCreationFailed,
                "令牌创建失败",
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            )
            .into_response(),
            ApiError::InvalidToken => ApiResponse::error_msg(
                AppErrorCode::AuthTokenInvalid,
                "无效的令牌",
                StatusCode::BAD_REQUEST.as_u16(),
            )
            .into_response(),
            ApiError::TokenExpired => ApiResponse::error_msg(
                AppErrorCode::AuthTokenExpired,
                "过期的令牌",
                StatusCode::UNAUTHORIZED.as_u16(),
            )
            .into_response(),
            ApiError::WrongOldPassword => ApiResponse::error_msg(
                AppErrorCode::UserWrongOldPassword,
                "旧密码不正确",
                StatusCode::BAD_REQUEST.as_u16(),
            )
            .into_response(),
            ApiError::ForbiddenResource => ApiResponse::error_msg(
                AppErrorCode::ResourceForbidden,
                "无权访问该资源",
                StatusCode::FORBIDDEN.as_u16(),
            )
            .into_response(),
            ApiError::ResourceNotFound => ApiResponse::error_msg(
                AppErrorCode::ResourceNotFound,
                "资源未找到",
                StatusCode::NOT_FOUND.as_u16(),
            )
            .into_response(),
            ApiError::InvalidPassword => ApiResponse::error_msg(
                AppErrorCode::UserInvalidPassword,
                "密码错误",
                StatusCode::UNAUTHORIZED.as_u16(),
            )
            .into_response(),
            ApiError::UsernameExists => ApiResponse::error_msg(
                AppErrorCode::UserUsernameExists,
                "用户名已存在",
                StatusCode::CONFLICT.as_u16(),
            )
            .into_response(),
            ApiError::ClientVersionMismatch(err) => ApiResponse::error_msg(
                AppErrorCode::SyncClientVersionMismatch,
                format!("客户端版本不匹配: {err}"),
                StatusCode::UPGRADE_REQUIRED.as_u16(),
            )
            .into_response(),
            ApiError::SyncProtocolMismatch(err) => ApiResponse::error_msg(
                AppErrorCode::SyncProtocolMismatch,
                format!("同步协议不匹配: {err}"),
                StatusCode::UPGRADE_REQUIRED.as_u16(),
            )
            .into_response(),
            ApiError::SyncSessionInvalid(err) => ApiResponse::error_msg(
                AppErrorCode::SyncSessionInvalid,
                format!("同步会话无效: {err}"),
                StatusCode::BAD_REQUEST.as_u16(),
            )
            .into_response(),
            ApiError::Sqlx(err) => ApiResponse::error_msg(
                AppErrorCode::InternalDbError,
                err.to_string(),
                StatusCode::BAD_REQUEST.as_u16(),
            )
            .into_response(),
            ApiError::Bcrypt(err) => ApiResponse::error_msg(
                AppErrorCode::InternalServerError,
                err.to_string(),
                StatusCode::BAD_REQUEST.as_u16(),
            )
            .into_response(),
            ApiError::Io(err) => ApiResponse::error_msg(
                AppErrorCode::InternalIoError,
                err.to_string(),
                StatusCode::BAD_REQUEST.as_u16(),
            )
            .into_response(),
            ApiError::Multipart(err) => ApiResponse::error_msg(
                AppErrorCode::RequestBadRequest,
                err.to_string(),
                StatusCode::BAD_REQUEST.as_u16(),
            )
            .into_response(),
            ApiError::MissingFileName => ApiResponse::error_msg(
                AppErrorCode::RequestBadRequest,
                "上传的文件缺少文件名",
                StatusCode::BAD_REQUEST.as_u16(),
            )
            .into_response(),
            ApiError::Validation(err) => ApiResponse::<()>::failure(
                AppErrorCode::RequestValidationFailed,
                "校验错误",
                StatusCode::BAD_REQUEST.as_u16(),
                Some(ValidationDetails::from([(
                    "request".to_string(),
                    vec![err.to_string()],
                )])),
            )
            .into_response(),
            ApiError::ValidationDetails(details) => ApiResponse::<()>::failure(
                AppErrorCode::RequestValidationFailed,
                "校验错误",
                StatusCode::BAD_REQUEST.as_u16(),
                Some(details),
            )
            .into_response(),
            ApiError::Token(err) => ApiResponse::error_msg(
                AppErrorCode::AuthTokenInvalid,
                err.to_string(),
                StatusCode::BAD_REQUEST.as_u16(),
            )
            .into_response(),
            ApiError::Internal(err) => ApiResponse::error_msg(
                AppErrorCode::InternalServerError,
                err.to_string(),
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            )
            .into_response(),
            ApiError::ParseError(err) => ApiResponse::error_msg(
                AppErrorCode::RequestBadRequest,
                err.to_string(),
                StatusCode::BAD_REQUEST.as_u16(),
            )
            .into_response(),
            ApiError::BadRequest(err) => ApiResponse::error_msg(
                AppErrorCode::RequestBadRequest,
                err.to_string(),
                StatusCode::BAD_REQUEST.as_u16(),
            )
            .into_response(),
            ApiError::NotFound => ApiResponse::error_msg(
                AppErrorCode::ResourceNotFound,
                "NotFound",
                StatusCode::NOT_FOUND.as_u16(),
            )
            .into_response(),
        }
    }
}

impl From<sqlx::Error> for ApiError {
    /// 将数据库错误转换为统一业务错误。
    fn from(err: sqlx::Error) -> Self {
        ApiError::Sqlx(err)
    }
}

impl From<BcryptError> for ApiError {
    /// 将密码学错误转换为统一业务错误。
    fn from(err: BcryptError) -> Self {
        ApiError::Bcrypt(err)
    }
}

impl From<tokio::io::Error> for ApiError {
    /// 将 I/O 错误转换为统一业务错误。
    fn from(err: tokio::io::Error) -> Self {
        ApiError::Io(err)
    }
}

impl From<MultipartError> for ApiError {
    /// 将 multipart 解析错误转换为统一业务错误。
    fn from(err: MultipartError) -> Self {
        ApiError::Multipart(err)
    }
}

impl From<ValidationErrors> for ApiError {
    /// 将 validator 校验错误转换为统一业务错误。
    fn from(err: ValidationErrors) -> Self {
        ApiError::Validation(err)
    }
}

impl From<SemverError> for ApiError {
    /// 将语义版本解析错误转换为统一业务错误。
    fn from(err: SemverError) -> Self {
        ApiError::ParseError(err)
    }
}

impl From<JwtError> for ApiError {
    /// 将 JWT 错误转换为统一业务错误。
    fn from(err: JwtError) -> Self {
        ApiError::Token(err)
    }
}
