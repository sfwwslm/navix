use crate::db::error::DbResult;
use shared_rs::dto::sync::{
    SearchEngineDto, ServerSyncData, SyncDataDto, WebsiteGroupDto, WebsitesDto,
};
use sqlx::{Row, Sqlite, SqlitePool, Transaction};

pub async fn apply_sync_result(
    pool: &SqlitePool,
    user_uuid: &str,
    server_data: &ServerSyncData,
) -> DbResult<()> {
    let mut tx = pool.begin().await?;

    process_server_data(&mut tx, user_uuid, &server_data.sync_data).await?;
    update_last_sync_revision(&mut tx, user_uuid, server_data.current_synced_rev).await?;

    tx.commit().await?;
    Ok(())
}

async fn process_server_data(
    tx: &mut Transaction<'_, Sqlite>,
    user_uuid: &str,
    sync_data: &SyncDataDto,
) -> DbResult<()> {
    let groups_to_clean =
        reconcile_website_group_conflicts(tx, user_uuid, &sync_data.website_groups).await?;

    upsert_website_groups(tx, user_uuid, &sync_data.website_groups).await?;
    upsert_websites(tx, user_uuid, &sync_data.websites).await?;
    upsert_search_engines(tx, user_uuid, &sync_data.search_engines).await?;

    for group_uuid in groups_to_clean {
        sqlx::query("DELETE FROM website_groups WHERE uuid = ?")
            .bind(group_uuid)
            .execute(tx.as_mut())
            .await?;
    }

    Ok(())
}

async fn reconcile_website_group_conflicts(
    tx: &mut Transaction<'_, Sqlite>,
    user_uuid: &str,
    server_groups: &[WebsiteGroupDto],
) -> DbResult<Vec<String>> {
    let local_groups = sqlx::query("SELECT uuid, name FROM website_groups WHERE user_uuid = ?")
        .bind(user_uuid)
        .fetch_all(tx.as_mut())
        .await?;

    let mut groups_to_clean = Vec::new();
    for server_group in server_groups {
        let local_conflict = local_groups.iter().find(|row| {
            let local_name: String = row.get("name");
            let local_uuid: String = row.get("uuid");
            local_name == server_group.name && local_uuid != server_group.uuid
        });

        let Some(local_conflict) = local_conflict else {
            continue;
        };

        let local_uuid: String = local_conflict.get("uuid");
        let local_name: String = local_conflict.get("name");
        let deprecated_name = format!("{}_deprecated_{}", local_name, current_timestamp_millis());

        sqlx::query("UPDATE website_groups SET name = ? WHERE uuid = ?")
            .bind(deprecated_name)
            .bind(&local_uuid)
            .execute(tx.as_mut())
            .await?;

        sqlx::query("UPDATE websites SET group_uuid = ? WHERE group_uuid = ?")
            .bind(&server_group.uuid)
            .bind(&local_uuid)
            .execute(tx.as_mut())
            .await?;

        groups_to_clean.push(local_uuid);
    }

    Ok(groups_to_clean)
}

async fn upsert_website_groups(
    tx: &mut Transaction<'_, Sqlite>,
    user_uuid: &str,
    groups: &[WebsiteGroupDto],
) -> DbResult<()> {
    for group in groups {
        sqlx::query(
            r#"
            INSERT INTO website_groups (
                uuid, user_uuid, name, description, sort_order, is_deleted, rev, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(uuid) DO UPDATE SET
                user_uuid = excluded.user_uuid,
                name = excluded.name,
                description = excluded.description,
                sort_order = excluded.sort_order,
                is_deleted = excluded.is_deleted,
                rev = excluded.rev,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&group.uuid)
        .bind(user_uuid)
        .bind(&group.name)
        .bind(&group.description)
        .bind(group.sort_order)
        .bind(group.is_deleted)
        .bind(group.rev)
        .bind(&group.updated_at)
        .execute(tx.as_mut())
        .await?;
    }

    Ok(())
}

async fn upsert_websites(
    tx: &mut Transaction<'_, Sqlite>,
    user_uuid: &str,
    websites: &[WebsitesDto],
) -> DbResult<()> {
    for website in websites {
        sqlx::query(
            r#"
            INSERT INTO websites (
                uuid, user_uuid, group_uuid, title, url, url_lan, default_icon, local_icon_path,
                background_color, description, sort_order, is_deleted, rev, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(uuid) DO UPDATE SET
                user_uuid = excluded.user_uuid,
                group_uuid = excluded.group_uuid,
                title = excluded.title,
                url = excluded.url,
                url_lan = excluded.url_lan,
                default_icon = excluded.default_icon,
                local_icon_path = excluded.local_icon_path,
                background_color = excluded.background_color,
                description = excluded.description,
                sort_order = excluded.sort_order,
                is_deleted = excluded.is_deleted,
                rev = excluded.rev,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&website.uuid)
        .bind(user_uuid)
        .bind(&website.group_uuid)
        .bind(&website.title)
        .bind(&website.url)
        .bind(&website.url_lan)
        .bind(&website.default_icon)
        .bind(&website.local_icon_path)
        .bind(&website.background_color)
        .bind(&website.description)
        .bind(website.sort_order)
        .bind(website.is_deleted)
        .bind(website.rev)
        .bind(&website.updated_at)
        .execute(tx.as_mut())
        .await?;
    }

    Ok(())
}

async fn upsert_search_engines(
    tx: &mut Transaction<'_, Sqlite>,
    user_uuid: &str,
    search_engines: &[SearchEngineDto],
) -> DbResult<()> {
    for search_engine in search_engines {
        sqlx::query(
            r#"
            INSERT INTO search_engines (
                uuid, user_uuid, name, url_template, default_icon, local_icon_path, is_default,
                sort_order, is_deleted, rev, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(uuid) DO UPDATE SET
                user_uuid = excluded.user_uuid,
                name = excluded.name,
                url_template = excluded.url_template,
                default_icon = excluded.default_icon,
                local_icon_path = excluded.local_icon_path,
                is_default = excluded.is_default,
                sort_order = excluded.sort_order,
                is_deleted = excluded.is_deleted,
                rev = excluded.rev,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&search_engine.uuid)
        .bind(user_uuid)
        .bind(&search_engine.name)
        .bind(&search_engine.url_template)
        .bind(&search_engine.default_icon)
        .bind(&search_engine.local_icon_path)
        .bind(search_engine.is_default)
        .bind(search_engine.sort_order)
        .bind(search_engine.is_deleted)
        .bind(search_engine.rev)
        .bind(&search_engine.updated_at)
        .execute(tx.as_mut())
        .await?;
    }

    Ok(())
}

async fn update_last_sync_revision(
    tx: &mut Transaction<'_, Sqlite>,
    user_uuid: &str,
    revision: i64,
) -> DbResult<()> {
    sqlx::query(
        r#"
        INSERT INTO sync_metadata (user_uuid, last_synced_rev)
        VALUES (?, ?)
        ON CONFLICT(user_uuid) DO UPDATE SET
            last_synced_rev = excluded.last_synced_rev
        "#,
    )
    .bind(user_uuid)
    .bind(revision)
    .execute(tx.as_mut())
    .await?;

    Ok(())
}

fn current_timestamp_millis() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};

    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}
