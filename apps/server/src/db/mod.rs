pub mod connection;
pub mod sync_sql;
use sqlx::SqlitePool;
use std::fmt;

pub type DbPool = SqlitePool;

#[derive(Debug, Clone, Copy)]
pub enum TableName {
    Users,
    WebsiteGroups,
    Websites,
    SearchEngines,
}

impl fmt::Display for TableName {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            TableName::Users => "users",
            TableName::WebsiteGroups => "website_groups",
            TableName::Websites => "websites",
            TableName::SearchEngines => "search_engines",
        };
        write!(f, "{s}")
    }
}

impl TableName {
    pub fn as_str(&self) -> &'static str {
        match self {
            TableName::Users => "users",
            TableName::WebsiteGroups => "website_groups",
            TableName::Websites => "websites",
            TableName::SearchEngines => "search_engines",
        }
    }
}
