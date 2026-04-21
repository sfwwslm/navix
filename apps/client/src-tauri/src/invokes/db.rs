use crate::db::pool::DbPool;
use serde::Serialize;
use shared_rs::dto::api::ApiResponse;
use tauri::State;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DbHealthCheckData {
    pub status: &'static str,
}

#[tauri::command]
pub async fn db_health_check(
    db_pool: State<'_, DbPool>,
) -> Result<ApiResponse<DbHealthCheckData>, ApiResponse<()>> {
    let ping = sqlx::query_scalar::<_, i64>("SELECT 1")
        .fetch_one(&db_pool.0)
        .await;

    match ping {
        Ok(_) => Ok(ApiResponse::success(
            "client database is ready",
            DbHealthCheckData { status: "ok" },
        )),
        Err(err) => Err(crate::db::error::DbError::from(err).into_response()),
    }
}
