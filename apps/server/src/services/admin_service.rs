use crate::{
    api::routes::jwt::Claims,
    config::STORAGE_BASE_DIR,
    db::DbPool,
    error::{ApiError, ApiResult},
    models::user::{AdminUserSummary, CreateUserPayload, ROLE_ADMIN},
    services::user_service,
    utils::is_safe_path_segment,
};
use serde::Serialize;
use sqlx::{Sqlite, Transaction};
use tokio::fs;
use tracing::warn;
use uuid::Uuid;

#[derive(Serialize, Debug)]
pub struct CleanupSummary {
    pub websites_deleted: u64,
    pub website_groups_deleted: u64,
    pub search_engines_deleted: u64,
    pub refresh_tokens_deleted: u64,
    pub user_deleted: u64,
    pub icon_files_deleted: u64,
}

#[derive(Serialize)]
pub struct AdminUserListResponse {
    pub users: Vec<AdminUserSummary>,
}

/// 管理员创建普通用户。
pub async fn create_user(
    pool: &DbPool,
    payload: &CreateUserPayload,
    actor: &Claims,
) -> ApiResult<AdminUserSummary> {
    if user_service::get_user_by_username(pool, &payload.username)
        .await?
        .is_some()
    {
        return Err(ApiError::UsernameExists);
    }

    let user = user_service::create_standard_user(pool, payload).await?;
    record_audit(
        pool,
        actor,
        "create_user",
        "user",
        Some(&user.uuid),
        Some("role=user"),
        Some("created"),
    )
    .await?;

    Ok(AdminUserSummary {
        uuid: user.uuid,
        username: user.username,
        role: user.role,
        disabled_at: user.disabled_at,
        deleted_at: user.deleted_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
    })
}

pub async fn list_users(pool: &DbPool) -> ApiResult<AdminUserListResponse> {
    let users = sqlx::query_as::<_, AdminUserSummary>(
        r#"
        SELECT uuid, username, role, disabled_at, deleted_at, created_at, updated_at
        FROM users
        ORDER BY created_at ASC
        "#,
    )
    .fetch_all(pool)
    .await?;
    Ok(AdminUserListResponse { users })
}

pub async fn disable_user(
    pool: &DbPool,
    target_uuid: &str,
    disabled: bool,
    actor: &Claims,
) -> ApiResult<()> {
    ensure_user_is_manageable(pool, target_uuid).await?;
    user_service::set_user_disabled(pool, target_uuid, disabled).await?;
    record_audit(
        pool,
        actor,
        if disabled {
            "disable_user"
        } else {
            "enable_user"
        },
        "user",
        Some(target_uuid),
        None,
        None,
    )
    .await?;
    Ok(())
}

pub async fn soft_delete_user(
    pool: &DbPool,
    target_uuid: &str,
    actor: &Claims,
) -> ApiResult<CleanupSummary> {
    ensure_user_is_manageable(pool, target_uuid).await?;
    user_service::soft_delete_user(pool, target_uuid).await?;
    let cleanup = cleanup_user_data(pool, target_uuid, false).await?;
    record_audit(
        pool,
        actor,
        "delete_user",
        "user",
        Some(target_uuid),
        None,
        Some(&format!("cleaned {:?}", cleanup)),
    )
    .await?;
    Ok(cleanup)
}

pub async fn cleanup_user(
    pool: &DbPool,
    target_uuid: &str,
    actor: &Claims,
) -> ApiResult<CleanupSummary> {
    let user = user_service::get_user_by_uuid(pool, target_uuid)
        .await?
        .ok_or(ApiError::UserNotFound)?;
    if user.role == ROLE_ADMIN {
        return Err(ApiError::ForbiddenResource);
    }
    if user.deleted_at.is_none() {
        return Err(ApiError::ForbiddenResource);
    }

    let cleanup = cleanup_user_data(pool, target_uuid, true).await?;
    record_audit(
        pool,
        actor,
        "cleanup_user",
        "user",
        Some(target_uuid),
        None,
        Some(&format!("cleaned {:?}", cleanup)),
    )
    .await?;
    Ok(cleanup)
}

/// 校验目标用户是否允许被管理台做禁用或删除操作。
async fn ensure_user_is_manageable(pool: &DbPool, target_uuid: &str) -> ApiResult<()> {
    let user = user_service::get_user_by_uuid(pool, target_uuid)
        .await?
        .ok_or(ApiError::UserNotFound)?;

    if user.role == ROLE_ADMIN {
        return Err(ApiError::ForbiddenResource);
    }

    Ok(())
}

async fn cleanup_user_data(
    pool: &DbPool,
    user_uuid: &str,
    hard_delete_user: bool,
) -> ApiResult<CleanupSummary> {
    let mut tx: Transaction<'_, Sqlite> = pool.begin().await?;

    let websites_deleted = sqlx::query("DELETE FROM websites WHERE user_uuid = $1")
        .bind(user_uuid)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    let website_groups_deleted = sqlx::query("DELETE FROM website_groups WHERE user_uuid = $1")
        .bind(user_uuid)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    let search_engines_deleted = sqlx::query("DELETE FROM search_engines WHERE user_uuid = $1")
        .bind(user_uuid)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    let refresh_tokens_deleted = sqlx::query("DELETE FROM refresh_tokens WHERE user_uuid = $1")
        .bind(user_uuid)
        .execute(&mut *tx)
        .await?
        .rows_affected();

    let mut user_deleted = 0u64;
    if hard_delete_user {
        let result = sqlx::query(
            r#"
            DELETE FROM users
            WHERE uuid = $1 AND deleted_at IS NOT NULL
            "#,
        )
        .bind(user_uuid)
        .execute(&mut *tx)
        .await?;

        user_deleted = result.rows_affected();
        if user_deleted == 0 {
            return Err(ApiError::ForbiddenResource);
        }
    }

    tx.commit().await?;

    let icon_files_deleted = cleanup_user_icons(user_uuid).await?;

    Ok(CleanupSummary {
        websites_deleted,
        website_groups_deleted,
        search_engines_deleted,
        refresh_tokens_deleted,
        user_deleted,
        icon_files_deleted,
    })
}

async fn cleanup_user_icons(user_uuid: &str) -> ApiResult<u64> {
    if !is_safe_path_segment(user_uuid) {
        return Err(ApiError::ForbiddenResource);
    }

    let storage_root = match fs::canonicalize(STORAGE_BASE_DIR).await {
        Ok(p) => p,
        Err(_) => return Ok(0),
    };
    let target_dir = std::path::PathBuf::from(STORAGE_BASE_DIR).join(user_uuid);
    let canonical_target = match fs::canonicalize(&target_dir).await {
        Ok(p) => p,
        Err(_) => return Ok(0),
    };

    if !canonical_target.starts_with(&storage_root) {
        warn!(
            "阻止删除越权目录: {:?} 不在 {:?} 下",
            canonical_target, storage_root
        );
        return Err(ApiError::ForbiddenResource);
    }

    let mut deleted = 0u64;
    let mut entries = fs::read_dir(&canonical_target).await?;
    while let Some(entry) = entries.next_entry().await? {
        let entry_path = entry.path();
        if entry.file_type().await?.is_file() {
            fs::remove_file(&entry_path).await?;
            deleted += 1;
        }
    }

    // 删除空目录
    let _ = fs::remove_dir_all(&canonical_target).await;
    Ok(deleted)
}

async fn record_audit(
    pool: &DbPool,
    actor: &Claims,
    action: &str,
    target_type: &str,
    target_uuid: Option<&str>,
    meta: Option<&str>,
    result: Option<&str>,
) -> ApiResult<()> {
    let uuid = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO audit_logs (uuid, actor_user_uuid, action, target_type, target_uuid, meta, result)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(uuid)
    .bind(&actor.sub)
    .bind(action)
    .bind(target_type)
    .bind(target_uuid)
    .bind(meta)
    .bind(result)
    .execute(pool)
    .await?;

    Ok(())
}
