//! 认证与用户相关 DTO。

use crate::dto::api::ValidationDetails;
use serde::{Deserialize, Serialize};

/// 当前登录用户信息载荷。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CurrentUserPayload {
    pub username: String,
    pub uuid: String,
    pub role: String,
    pub disabled_at: Option<String>,
    pub deleted_at: Option<String>,
}

/// JWT claims。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub iss: String,
    pub username: String,
    #[serde(default)]
    pub roles: Vec<String>,
}

/// 登录请求体。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

impl LoginRequest {
    /// 执行字段级校验并返回稳定校验码集合。
    pub fn validate_fields(&self) -> ValidationDetails {
        let mut details = ValidationDetails::new();
        if self.username.trim().is_empty() {
            details.insert(
                "username".to_string(),
                vec!["VALIDATION.USERNAME_REQUIRED".to_string()],
            );
        }
        if self.password.trim().is_empty() {
            details.insert(
                "password".to_string(),
                vec!["VALIDATION.PASSWORD_REQUIRED".to_string()],
            );
        }
        details
    }
}

/// 刷新令牌请求体。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

impl RefreshRequest {
    /// 执行字段级校验并返回稳定校验码集合。
    pub fn validate_fields(&self) -> ValidationDetails {
        let mut details = ValidationDetails::new();
        if self.refresh_token.trim().is_empty() {
            details.insert(
                "refresh_token".to_string(),
                vec!["VALIDATION.REFRESH_TOKEN_REQUIRED".to_string()],
            );
        }
        details
    }
}

/// 登录成功响应体。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoginResponse {
    pub access_token: String,
    pub token_type: String,
    pub refresh_token: String,
}

/// 用户创建请求体。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CreateUserPayload {
    pub username: String,
    pub password: String,
}

impl CreateUserPayload {
    /// 执行字段级校验并返回稳定校验码集合。
    pub fn validate_fields(&self) -> ValidationDetails {
        let mut details = ValidationDetails::new();
        if self.username.trim().is_empty() {
            details.insert(
                "username".to_string(),
                vec!["VALIDATION.USERNAME_TOO_SHORT".to_string()],
            );
        }
        if self.password.trim().len() < 2 {
            details.insert(
                "password".to_string(),
                vec!["VALIDATION.PASSWORD_TOO_SHORT".to_string()],
            );
        }
        details
    }
}

/// 修改密码请求体。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChangePasswordPayload {
    pub old_password: String,
    pub new_password: String,
}

impl ChangePasswordPayload {
    /// 执行字段级校验并返回稳定校验码集合。
    pub fn validate_fields(&self) -> ValidationDetails {
        let mut details = ValidationDetails::new();
        if self.old_password.trim().is_empty() {
            details.insert(
                "old_password".to_string(),
                vec!["VALIDATION.OLD_PASSWORD_REQUIRED".to_string()],
            );
        }
        if self.new_password.trim().len() < 2 {
            details.insert(
                "new_password".to_string(),
                vec!["VALIDATION.NEW_PASSWORD_TOO_SHORT".to_string()],
            );
        }
        details
    }
}

/// 修改用户名请求体。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateUsernamePayload {
    pub new_username: String,
}

impl UpdateUsernamePayload {
    /// 执行字段级校验并返回稳定校验码集合。
    pub fn validate_fields(&self) -> ValidationDetails {
        let mut details = ValidationDetails::new();
        if self.new_username.trim().is_empty() {
            details.insert(
                "new_username".to_string(),
                vec!["VALIDATION.NEW_USERNAME_REQUIRED".to_string()],
            );
        }
        details
    }
}
