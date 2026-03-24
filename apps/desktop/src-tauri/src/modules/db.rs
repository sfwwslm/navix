use crate::utils::app_data_dir_path;
use std::fmt;
use std::path::PathBuf;
use tauri::Manager;

#[cfg(debug_assertions)]
const DATABASE_FILE: &str = "navix-dev.db";

#[cfg(not(debug_assertions))]
const DATABASE_FILE: &str = "navix.db";

#[derive(Debug, Clone, Copy)]
pub enum TableName {
    Users,
    WebsiteGroups,
    WebsiteItems,
}

impl fmt::Display for TableName {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            TableName::Users => "users",
            TableName::WebsiteGroups => "website_groups",
            TableName::WebsiteItems => "websites",
        };
        write!(f, "{s}")
    }
}

pub fn database_file_path(app: &tauri::App) -> PathBuf {
    app_data_dir_path(app).join(DATABASE_FILE)
}

pub fn database_file_path_from_handle(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle
        .path()
        .app_data_dir()
        .expect("failed to get app data dir")
        .join(DATABASE_FILE)
}
