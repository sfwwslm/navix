use super::DbPool;
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use std::str::FromStr;

/// 从环境变量 `DATABASE_URL` 获取连接字符串。
/// 如果环境变量未设置，则使用提供的默认值。
pub async fn establish_connection(db_url: &str) -> Result<DbPool, sqlx::Error> {
    tracing::info!("Connecting to the user-specified database: {}", db_url);

    let opts = SqliteConnectOptions::from_str(db_url)?
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .foreign_keys(true); // 显式启用外键

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(opts)
        .await?;

    tracing::info!("Running database migrations...");
    sqlx::migrate!().run(&pool).await?;
    tracing::info!("Database migrations completed...");

    Ok(pool)
}
