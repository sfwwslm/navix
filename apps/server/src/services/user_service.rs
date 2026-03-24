use crate::api::routes::jwt::Claims;
use crate::db::DbPool;
use crate::error::{ApiError, ApiResult};
use crate::models::user::{
    ChangePasswordPayload, CreateUserPayload, ROLE_ADMIN, ROLE_USER, UpdateUsernamePayload,
    UserEntityDto,
};
use bcrypt::{DEFAULT_COST, hash, verify};
use uuid::Uuid;

fn normalize_username(username: &str) -> String {
    username.trim().to_lowercase()
}

/// 根据用户名查找用户
pub async fn get_user_by_username(
    pool: &DbPool,
    username: &str,
) -> ApiResult<Option<UserEntityDto>> {
    let normalized = normalize_username(username);
    let user = sqlx::query_as::<_, UserEntityDto>(
        r#"
        SELECT uuid, username, username_normalized, password_hash, role, disabled_at, deleted_at, created_at, updated_at
        FROM users
        WHERE username_normalized = $1
        "#,
    )
    .bind(normalized)
    .fetch_optional(pool)
    .await?;
    Ok(user)
}

/// 根据 UUID 查找用户
pub async fn get_user_by_uuid(pool: &DbPool, uuid: &str) -> ApiResult<Option<UserEntityDto>> {
    let user = sqlx::query_as::<_, UserEntityDto>(
        r#"
        SELECT uuid, username, username_normalized, password_hash, role, disabled_at, deleted_at, created_at, updated_at
        FROM users
        WHERE uuid = $1
        "#,
    )
    .bind(uuid)
    .fetch_optional(pool)
    .await?;
    Ok(user)
}

/// 验证用户密码
pub async fn verify_user_credentials(
    pool: &DbPool,
    payload: &shared_rs::dto::auth::LoginRequest,
) -> ApiResult<UserEntityDto> {
    let user = get_user_by_username(pool, &payload.username)
        .await?
        .ok_or_else(|| ApiError::UserNotFound)?;

    if user.deleted_at.is_some() {
        return Err(ApiError::UserDeleted);
    }
    if user.disabled_at.is_some() {
        return Err(ApiError::UserDisabled);
    }

    if verify(&payload.password, &user.password_hash)? {
        Ok(user)
    } else {
        Err(ApiError::InvalidPassword)
    }
}

/// 创建一个新用户
pub async fn create_user(pool: &DbPool, payload: &CreateUserPayload) -> ApiResult<UserEntityDto> {
    create_user_with_role(pool, payload, ROLE_USER).await
}

/// 返回系统是否已经完成初始化。
pub async fn is_bootstrap_initialized(pool: &DbPool) -> ApiResult<bool> {
    Ok(count_users(pool).await? > 0)
}

/// 初始化唯一管理员账号。
pub async fn bootstrap_admin(
    pool: &DbPool,
    payload: &CreateUserPayload,
) -> ApiResult<UserEntityDto> {
    if count_users(pool).await? > 0 {
        return Err(ApiError::BadRequest(
            "系统已初始化，后续新增账号请使用管理员控制台".to_string(),
        ));
    }

    create_user_with_role(pool, payload, ROLE_ADMIN).await
}

/// 创建普通用户账号。
pub async fn create_standard_user(
    pool: &DbPool,
    payload: &CreateUserPayload,
) -> ApiResult<UserEntityDto> {
    create_user_with_role(pool, payload, ROLE_USER).await
}

/// 返回当前用户总数。
pub async fn count_users(pool: &DbPool) -> ApiResult<i64> {
    sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(1)
        FROM users
        "#,
    )
    .fetch_one(pool)
    .await
    .map_err(ApiError::from)
}

/// 按指定角色创建用户。
async fn create_user_with_role(
    pool: &DbPool,
    payload: &CreateUserPayload,
    role: &str,
) -> ApiResult<UserEntityDto> {
    let hashed_password =
        hash(&payload.password, DEFAULT_COST).map_err(|e| ApiError::Internal(e.to_string()))?;
    let new_uuid = Uuid::new_v4().to_string();
    let username_normalized = normalize_username(&payload.username);

    sqlx::query(
        r#"
        INSERT INTO users (uuid, username, username_normalized, password_hash, role, disabled_at, deleted_at)
        VALUES ($1, $2, $3, $4, $5, NULL, NULL)
        "#,
    )
    .bind(&new_uuid)
    .bind(&payload.username)
    .bind(&username_normalized)
    .bind(&hashed_password)
    .bind(role)
    .execute(pool)
    .await?;

    // 返回新创建的用户信息
    let new_user = get_user_by_username(pool, &payload.username)
        .await?
        .expect("Failed to fetch user after creation");

    Ok(new_user)
}

/// 修改用户密码
pub async fn change_user_password(
    pool: &DbPool,
    claims: Claims,
    payload: &ChangePasswordPayload,
) -> ApiResult<()> {
    // 1. 根据 JWT 中的 UUID 获取用户信息
    let user = get_user_by_uuid(pool, &claims.sub)
        .await?
        .ok_or(ApiError::UserNotFound)?;

    // 2. 验证旧密码是否正确
    if !verify(&payload.old_password, &user.password_hash)? {
        return Err(ApiError::WrongOldPassword);
    }

    // 3. 哈希新密码
    let new_hashed_password = hash(&payload.new_password, DEFAULT_COST)?;

    // 4. 更新数据库中的密码
    sqlx::query(
        r#"
        UPDATE users
        SET password_hash = $1
        WHERE uuid = $2
        "#,
    )
    .bind(&new_hashed_password)
    .bind(&claims.sub)
    .execute(pool)
    .await?;

    Ok(())
}

/// 修改用户名
pub async fn change_username(
    pool: &DbPool,
    claims: Claims,
    payload: &UpdateUsernamePayload,
) -> ApiResult<()> {
    let username_normalized = normalize_username(&payload.new_username);
    // 1. 检查新用户名是否已存在
    if get_user_by_username(pool, &payload.new_username)
        .await?
        .is_some()
    {
        return Err(ApiError::UsernameExists);
    }

    // 2. 更新数据库中的用户名
    sqlx::query(
        r#"
        UPDATE users
        SET username = $1, username_normalized = $2
        WHERE uuid = $3
        "#,
    )
    .bind(&payload.new_username)
    .bind(&username_normalized)
    .bind(&claims.sub)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn set_user_disabled(pool: &DbPool, target_uuid: &str, disabled: bool) -> ApiResult<()> {
    let now = chrono::Utc::now().to_rfc3339();
    let timestamp = if disabled { Some(now) } else { None };
    sqlx::query(
        r#"
        UPDATE users
        SET disabled_at = $1
        WHERE uuid = $2
        "#,
    )
    .bind(timestamp)
    .bind(target_uuid)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn soft_delete_user(pool: &DbPool, target_uuid: &str) -> ApiResult<()> {
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        r#"
        UPDATE users
        SET deleted_at = $1, disabled_at = $1
        WHERE uuid = $2
        "#,
    )
    .bind(now)
    .bind(target_uuid)
    .execute(pool)
    .await?;
    Ok(())
}
