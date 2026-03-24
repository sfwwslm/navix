use crate::db::error::DbResult;
use crate::modules;
use shared_rs::dto::telemetry::LogLevel;
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};
use sqlx::{Executor, SqlitePool};
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;
use std::time::Duration;

const DB_MAX_CONNECTIONS: u32 = 4;
const DB_ACQUIRE_TIMEOUT_SECS: u64 = 5;
const DB_BUSY_TIMEOUT_MS: u64 = 5_000;
static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

#[derive(Clone)]
pub struct DbPool(pub SqlitePool);

impl DbPool {
    pub fn inner(&self) -> &SqlitePool {
        &self.0
    }

    pub async fn close(&self) {
        self.0.close().await;
    }
}

pub async fn init(app: &tauri::App) -> DbResult<DbPool> {
    let db_file = modules::db::database_file_path(app);
    let trace_id = modules::telemetry::ensure_trace_id();
    let db_file_value = db_file.display().to_string();

    modules::telemetry::emit_event(
        "desktop.db.init_started",
        LogLevel::Info,
        &trace_id,
        BTreeMap::from([
            ("db_path".to_string(), db_file_value.clone()),
            (
                "max_connections".to_string(),
                DB_MAX_CONNECTIONS.to_string(),
            ),
            (
                "acquire_timeout_secs".to_string(),
                DB_ACQUIRE_TIMEOUT_SECS.to_string(),
            ),
            (
                "busy_timeout_ms".to_string(),
                DB_BUSY_TIMEOUT_MS.to_string(),
            ),
        ]),
        "init",
    );

    let result: DbResult<DbPool> = async {
        ensure_parent_dir(&db_file)?;

        let options = SqliteConnectOptions::new()
            .filename(&db_file)
            .create_if_missing(true)
            .foreign_keys(true)
            .journal_mode(SqliteJournalMode::Wal)
            .synchronous(SqliteSynchronous::Normal)
            .busy_timeout(Duration::from_millis(DB_BUSY_TIMEOUT_MS));

        let pool = SqlitePoolOptions::new()
            .max_connections(DB_MAX_CONNECTIONS)
            .acquire_timeout(Duration::from_secs(DB_ACQUIRE_TIMEOUT_SECS))
            .connect_with(options)
            .await?;

        pool.execute("PRAGMA foreign_keys = ON;").await?;
        pool.execute("PRAGMA journal_mode = WAL;").await?;
        pool.execute(format!("PRAGMA busy_timeout = {DB_BUSY_TIMEOUT_MS};").as_str())
            .await?;
        MIGRATOR.run(&pool).await?;

        Ok(DbPool(pool))
    }
    .await;

    match &result {
        Ok(_) => modules::telemetry::emit_event(
            "desktop.db.init_completed",
            LogLevel::Info,
            &trace_id,
            BTreeMap::from([("db_path".to_string(), db_file_value)]),
            "init",
        ),
        Err(err) => modules::telemetry::emit_event(
            "desktop.db.init_failed",
            LogLevel::Error,
            &trace_id,
            BTreeMap::from([
                ("db_path".to_string(), db_file_value),
                ("code".to_string(), err.code().to_string()),
                ("message".to_string(), err.message().to_string()),
            ]),
            "init",
        ),
    }

    result
}

fn ensure_parent_dir(path: &Path) -> DbResult<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    Ok(())
}
