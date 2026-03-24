use serde::{Deserialize, Serialize};
pub use shared_rs::dto::auth::{
    ChangePasswordPayload, CreateUserPayload, CurrentUserPayload, UpdateUsernamePayload,
};

/// 普通用户角色标识。
pub const ROLE_USER: &str = "user";
/// 管理员角色标识。
pub const ROLE_ADMIN: &str = "admin";

/// 用户模型，对应数据库中的 `users` 表
#[derive(Debug, sqlx::FromRow, Serialize, Deserialize)]
pub struct UserEntityDto {
    pub uuid: String,
    pub username: String,
    pub username_normalized: String,
    #[serde(skip_serializing)] // 不在序列化时返回密码哈希
    pub password_hash: String,
    pub role: String,
    pub disabled_at: Option<String>,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(sqlx::FromRow, Serialize)]
/// 管理端用户列表摘要。
pub struct AdminUserSummary {
    pub uuid: String,
    pub username: String,
    pub role: String,
    pub disabled_at: Option<String>,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
