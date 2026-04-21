use crate::db::error::DbResult;
use sqlx::{Row, SqlitePool};

const ANONYMOUS_USER_UUID: &str = "00000000-0000-0000-0000-000000000000";

pub async fn reassign_anonymous_data_to_user(
    pool: &SqlitePool,
    real_user_uuid: &str,
) -> DbResult<()> {
    let mut tx = pool.begin().await?;

    let anonymous_groups = sqlx::query("SELECT uuid, name FROM website_groups WHERE user_uuid = ?")
        .bind(ANONYMOUS_USER_UUID)
        .fetch_all(tx.as_mut())
        .await?;
    let user_groups = sqlx::query("SELECT uuid, name FROM website_groups WHERE user_uuid = ?")
        .bind(real_user_uuid)
        .fetch_all(tx.as_mut())
        .await?;

    for anon_group in anonymous_groups {
        let anon_uuid: String = anon_group.get("uuid");
        let anon_name: String = anon_group.get("name");
        let conflict = user_groups
            .iter()
            .find(|row| row.get::<String, _>("name") == anon_name);

        if let Some(conflict) = conflict {
            let conflict_uuid: String = conflict.get("uuid");
            sqlx::query("UPDATE websites SET group_uuid = ?, user_uuid = ? WHERE group_uuid = ?")
                .bind(conflict_uuid)
                .bind(real_user_uuid)
                .bind(&anon_uuid)
                .execute(tx.as_mut())
                .await?;
            sqlx::query("DELETE FROM website_groups WHERE uuid = ?")
                .bind(&anon_uuid)
                .execute(tx.as_mut())
                .await?;
        } else {
            sqlx::query("UPDATE website_groups SET user_uuid = ? WHERE uuid = ?")
                .bind(real_user_uuid)
                .bind(&anon_uuid)
                .execute(tx.as_mut())
                .await?;
        }
    }

    sqlx::query("UPDATE websites SET user_uuid = ? WHERE user_uuid = ?")
        .bind(real_user_uuid)
        .bind(ANONYMOUS_USER_UUID)
        .execute(tx.as_mut())
        .await?;

    tx.commit().await?;
    Ok(())
}
