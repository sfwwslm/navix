use shared_rs::dto::api::{ApiResponse, AppErrorCode};
use sqlx::error::DatabaseError;
use sqlx::sqlite::SqliteError;

pub type DbResult<T> = Result<T, DbError>;

#[derive(Debug)]
pub enum DbError {
    Busy,
    ReadOnly,
    Constraint,
    Sqlx(sqlx::Error),
    Migrate(sqlx::migrate::MigrateError),
    Io(std::io::Error),
}

impl DbError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Busy => "DB.BUSY",
            Self::ReadOnly => "DB.READ_ONLY",
            Self::Constraint => "DB.CONSTRAINT",
            Self::Sqlx(_) | Self::Migrate(_) | Self::Io(_) => "DB.UNKNOWN",
        }
    }

    pub fn message(&self) -> &'static str {
        match self {
            Self::Busy => "database is busy",
            Self::ReadOnly => "database is read-only",
            Self::Constraint => "database constraint violated",
            Self::Sqlx(_) | Self::Migrate(_) => "database operation failed",
            Self::Io(_) => "database I/O failed",
        }
    }

    pub fn into_response<T>(self) -> ApiResponse<T> {
        ApiResponse::failure(
            AppErrorCode::InternalDbError,
            format!("{}: {}", self.code(), self.message()),
            500,
            None,
        )
    }
}

impl From<sqlx::Error> for DbError {
    fn from(value: sqlx::Error) -> Self {
        if let sqlx::Error::Database(err) = &value
            && let Some(sqlite_err) = err.try_downcast_ref::<SqliteError>()
        {
            return match sqlite_err.code().as_deref() {
                Some("5") | Some("6") => Self::Busy,
                Some("8") => Self::ReadOnly,
                Some("1555") | Some("2067") | Some("787") => Self::Constraint,
                _ => Self::Sqlx(value),
            };
        }

        Self::Sqlx(value)
    }
}

impl From<std::io::Error> for DbError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value)
    }
}

impl From<sqlx::migrate::MigrateError> for DbError {
    fn from(value: sqlx::migrate::MigrateError) -> Self {
        Self::Migrate(value)
    }
}
