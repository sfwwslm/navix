use super::TableName;
use anyhow::Result;
use sqlx::{Sqlite, Transaction};
use tracing::{debug, error, info};

#[derive(sqlx::FromRow, Debug)]
pub struct RecordStatus {
    pub rev: i64,
    pub is_deleted: i64,
}

pub async fn record_exists_by_uuid(
    tx: &mut Transaction<'_, Sqlite>,
    uuid: &str,
    user_uuid: &str,
    table_name: TableName,
) -> Result<bool> {
    let sql = format!(
        "SELECT COUNT(*) as count FROM {table_name} WHERE uuid = ? AND user_uuid = ? LIMIT 1"
    );
    let count: i64 = sqlx::query_scalar(&sql)
        .bind(uuid)
        .bind(user_uuid)
        .fetch_one(&mut **tx)
        .await?;

    let exists = count > 0;
    debug!(
        "使用 {} 在 {} 表中 查询的结果是: {}",
        uuid, table_name, exists
    );
    Ok(exists)
}

pub async fn query_record_status_by_uuid(
    tx: &mut Transaction<'_, Sqlite>,
    uuid: &str,
    user_uuid: &str,
    table_name: TableName,
) -> Result<RecordStatus> {
    let sql = format!(
        "SELECT rev, is_deleted FROM {table_name} WHERE uuid = ? AND user_uuid = ? LIMIT 1"
    );

    let record_status: RecordStatus = sqlx::query_as(&sql)
        .bind(uuid)
        .bind(user_uuid)
        .fetch_one(&mut **tx)
        .await?;

    Ok(record_status)
}

pub async fn website_group_name_exists_for_user(
    tx: &mut Transaction<'_, Sqlite>,
    name: &str,
    user_uuid: &str,
) -> Result<bool> {
    let sql = format!(
        "SELECT COUNT(*) as count FROM {} WHERE name = ? AND user_uuid = ? LIMIT 1",
        TableName::WebsiteGroups
    );
    let count: u8 = sqlx::query_scalar(&sql)
        .bind(name)
        .bind(user_uuid)
        .fetch_one(&mut **tx)
        .await?;

    let exists = count > 0;
    info!(
        "{} 用户的 {} 网站分组是否已存在，查询的结果是: {}",
        user_uuid, name, exists
    );
    Ok(exists)
}

pub async fn group_exists(
    tx: &mut Transaction<'_, Sqlite>,
    user_uuid: &str,
    group_uuid: &str,
) -> Result<bool> {
    record_exists_by_uuid(tx, group_uuid, user_uuid, TableName::WebsiteGroups).await
}

pub async fn get_group_uuid_by_name(
    tx: &mut Transaction<'_, Sqlite>,
    user_uuid: &str,
    group_name: &str,
) -> Result<String> {
    let sql = format!(
        "SELECT uuid FROM {} WHERE name = ? AND user_uuid = ? LIMIT 1",
        TableName::WebsiteGroups
    );

    let group_uuid = sqlx::query_scalar::<_, String>(&sql)
        .bind(group_name)
        .bind(user_uuid)
        .fetch_optional(&mut **tx)
        .await?;

    match group_uuid {
        Some(uuid) => Ok(uuid),
        None => {
            error!(
                "没有找到名称为 '{}' 的网站分组！这是不符合预期的！",
                group_name
            );
            Err(anyhow::anyhow!(
                "没有找到名称为 '{}' 的网站分组",
                group_name
            ))
        }
    }
}

pub async fn search_engine_name_exists_for_user(
    tx: &mut Transaction<'_, Sqlite>,
    name: &str,
    user_uuid: &str,
) -> Result<bool> {
    let sql = format!(
        "SELECT COUNT(*) as count FROM {} WHERE name = ? AND user_uuid = ? LIMIT 1",
        TableName::SearchEngines
    );
    let count: u8 = sqlx::query_scalar(&sql)
        .bind(name)
        .bind(user_uuid)
        .fetch_one(&mut **tx)
        .await?;

    let exists = count > 0;
    info!(
        "{} 用户的 {} 搜索引擎是否已存在，查询结果是: {}",
        user_uuid, name, exists
    );
    Ok(exists)
}

#[cfg(test)]
mod tests {
    use super::{TableName, record_exists_by_uuid};
    use sqlx::sqlite::SqlitePoolOptions;

    #[tokio::test]
    async fn record_exists_is_user_scoped() {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("connect in-memory sqlite");

        sqlx::query(
            "CREATE TABLE website_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uuid TEXT NOT NULL UNIQUE,
                user_uuid TEXT NOT NULL,
                name TEXT NOT NULL,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                rev INTEGER NOT NULL DEFAULT 0
            )",
        )
        .execute(&pool)
        .await
        .expect("create website_groups");

        sqlx::query("INSERT INTO website_groups (uuid, user_uuid, name) VALUES (?1, ?2, ?3)")
            .bind("group-u1")
            .bind("u1")
            .bind("g1")
            .execute(&pool)
            .await
            .expect("seed u1 group");

        let mut tx = pool.begin().await.expect("begin tx");
        let exists_for_u1 =
            record_exists_by_uuid(&mut tx, "group-u1", "u1", TableName::WebsiteGroups)
                .await
                .expect("exists for u1");
        let exists_for_u2 =
            record_exists_by_uuid(&mut tx, "group-u1", "u2", TableName::WebsiteGroups)
                .await
                .expect("exists for u2");
        assert!(exists_for_u1);
        assert!(!exists_for_u2);
    }
}
