pub mod db;
pub mod init;
pub mod invokes;
pub mod modules;
pub mod types;
pub mod utils;

use crate::db::pool::DbPool;
use shared_rs::dto::telemetry::LogLevel;
use std::collections::BTreeMap;
use tauri::Manager;
use tauri::RunEvent;
use tauri_plugin_autostart::MacosLauncher;

fn close_db_pool(app: &tauri::AppHandle) {
    let trace_id = crate::modules::telemetry::ensure_trace_id();
    let db_file = crate::modules::db::database_file_path_from_handle(app);
    let db_path = db_file.display().to_string();

    crate::modules::telemetry::emit_event(
        "client.db.close_started",
        LogLevel::Info,
        &trace_id,
        BTreeMap::from([("db_path".to_string(), db_path.clone())]),
        "close",
    );

    let db_pool = app.state::<DbPool>().inner().clone();
    tauri::async_runtime::block_on(async move {
        db_pool.close().await;
    });

    crate::modules::telemetry::emit_event(
        "client.db.close_completed",
        LogLevel::Info,
        &trace_id,
        BTreeMap::from([("db_path".to_string(), db_path)]),
        "close",
    );
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 默认情况下，当应用程序已经在运行时启动新实例时，不会采取任何操作。当用户尝试打开一个新实例时，为了聚焦正在运行实例的窗口，修改回调闭包如下。
            let windows = app.webview_windows();
            windows
                .values()
                .next()
                .expect("Sorry, no window found")
                .set_focus()
                .expect("Can't Bring Window to Focus");
        }))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            init::setup(app);
            init::manage(app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            invokes::metadata::fetch_website_metadata,
            invokes::metadata::save_uploaded_icon,
            invokes::bookmark_parser::bookmark_parser,
            invokes::user_db::get_all_users_record,
            invokes::user_db::get_used_icon_names_record,
            invokes::user_db::save_user_record,
            invokes::user_db::update_username_record,
            invokes::user_db::set_user_login_status,
            invokes::user_db::update_user_server_address,
            invokes::user_db::delete_user_with_data_record,
            invokes::launchpad_db::get_launchpad_data_record,
            invokes::launchpad_db::get_search_engines_record,
            invokes::launchpad_db::get_default_search_engine_record,
            invokes::launchpad_db::save_website_group,
            invokes::launchpad_db::update_website_groups_order,
            invokes::launchpad_db::delete_website_group,
            invokes::launchpad_db::save_website_item,
            invokes::launchpad_db::update_website_items_order,
            invokes::launchpad_db::delete_website_item,
            invokes::launchpad_db::ensure_default_launchpad_data,
            invokes::launchpad_db::save_search_engine_record,
            invokes::launchpad_db::set_active_search_engine_record,
            invokes::launchpad_db::clear_default_search_engine_record,
            invokes::launchpad_db::delete_search_engine_record,
            invokes::claim_db::reassign_anonymous_data_to_user,
            invokes::db::db_health_check,
            invokes::sync_apply::apply_sync_result,
            invokes::sync_db::create_sync_log_record,
            invokes::sync_db::finalize_sync_log_record,
            invokes::sync_db::collect_local_sync_data,
            invokes::sync_db::get_last_sync_revision_record,
            invokes::sync::check_token_and_user,
            invokes::sync::check_server_compatibility,
            invokes::sync::sync_start,
            invokes::sync::sync_chunk,
            invokes::sync::sync_complete,
            invokes::sync::upload_icon,
            invokes::sync::download_icon,
            invokes::browser::detect_installed_browsers,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                close_db_pool(app);
            }
        });
}
