use std::collections::HashMap;

use tauri::{
    AppHandle, Listener, Manager, Runtime,
    menu::{IsMenuItem, Menu, MenuEvent, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
};

use crate::modules::telemetry;
use crate::types::{APP_CONFIG_DIR, APP_CONFIG_FILE, HOME_VUST_DIR};
use serde::Deserialize;
use shared_rs::dto::telemetry::LogLevel;
use std::fs;

// 定义需要的配置项
#[derive(Deserialize, Default, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct AppConfig {
    #[serde(default = "default_bool_false")]
    start_minimized: bool,
}

fn default_bool_false() -> bool {
    false
}

fn read_config(app_handle: &AppHandle) -> AppConfig {
    let config_path = app_handle
        .path()
        .home_dir()
        .expect("failed to get app config dir")
        .join(HOME_VUST_DIR)
        .join(APP_CONFIG_DIR)
        .join(APP_CONFIG_FILE);

    if config_path.exists()
        && let Ok(content) = fs::read_to_string(config_path)
        && !content.trim().is_empty()
    {
        return serde_json::from_str::<AppConfig>(&content).unwrap_or_default();
    }
    AppConfig::default()
}

// 退出前先持久化窗口隐藏状态，保证下次启动时能按该状态恢复；
// 真正的退出流程由调用方负责，避免这里混入窗口关闭或应用退出逻辑。
fn prepare_window_state_for_exit(app_handle: &AppHandle) {
    let config = read_config(app_handle);
    if config.start_minimized {
        // 如果用户希望下次启动时最小化，则先隐藏所有窗口再退出
        let window = app_handle.get_webview_window("main").unwrap();
        if let Err(error) = window.hide() {
            telemetry::emit_event(
                "client.tray.exit_failed",
                LogLevel::Error,
                &telemetry::ensure_trace_id(),
                std::collections::BTreeMap::from([(
                    "message".to_string(),
                    format!("failed to hide window before exit: {error}"),
                )]),
                "prepare_window_state_for_exit",
            );
        }
    }
}

// 定义一个类型别名，方便处理事件 payload
pub type TrayMenuItemsPayload = HashMap<String, String>;

/// 更新托盘菜单：接收一个 `HashMap`，用 ID 和标题重建菜单项
pub fn update_tray_menu_items<R: Runtime>(
    app: &AppHandle<R>,
    mut new_items: TrayMenuItemsPayload,
) -> tauri::Result<()> {
    let tray = app.tray_by_id("main_tray").unwrap();

    #[cfg(any(target_os = "windows", target_os = "linux"))]
    let title = new_items.remove("title").unwrap_or_default();

    #[cfg(target_os = "macos")]
    let _ = new_items.remove("title");

    // 直接用栈上的 MenuItem<R>
    let mut menu_items = Vec::with_capacity(new_items.len());

    for (id, text) in new_items {
        let item = MenuItem::with_id(app, id, text, true, None::<&str>)?;
        menu_items.push(item);
    }

    // 构造 &[&dyn IsMenuItem] 切片
    let item_refs: Vec<&dyn IsMenuItem<R>> =
        menu_items.iter().map(|i| i as &dyn IsMenuItem<R>).collect();

    let new_menu = Menu::with_items(app, &item_refs)?;
    tray.set_menu(Some(new_menu))?;

    #[cfg(target_os = "windows")]
    tray.set_tooltip(Some(title))?;

    #[cfg(target_os = "linux")]
    tray.set_title(Some(title))?;

    telemetry::emit_event(
        "client.tray.updated",
        LogLevel::Info,
        &telemetry::ensure_trace_id(),
        std::collections::BTreeMap::from([("item_count".to_string(), item_refs.len().to_string())]),
        "update_tray_menu_items",
    );
    Ok(())
}

/// 创建系统托盘
pub fn create(app: &mut tauri::App) -> tauri::Result<()> {
    let menu = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    TrayIconBuilder::with_id("main_tray")
        .tooltip("Vust")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&Menu::with_items(app, &[&menu])?)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray: &TrayIcon, event: TrayIconEvent| {
            match event {
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } => {
                    let app = tray.app_handle();
                    if let Some(window) = app.get_webview_window("main") {
                        if window.is_minimized().expect("获取窗口最小化状态失败") {
                            window.unminimize().expect("取消最小化窗口失败");
                        }
                        window.show().expect("显示窗口失败");
                        window.set_focus().expect("聚焦窗口失败");
                    }
                }
                _ => {
                    // debug!("未处理的事件 {event:?}");
                }
            }
        })
        .on_menu_event(
            |app: &tauri::AppHandle, event: MenuEvent| match event.id.as_ref() {
                "quit" => {
                    telemetry::emit_event(
                        "client.tray.quit_requested",
                        LogLevel::Info,
                        &telemetry::ensure_trace_id(),
                        std::collections::BTreeMap::new(),
                        "create",
                    );
                    prepare_window_state_for_exit(app);
                    if let Some(window) = app.get_webview_window("main")
                        && let Err(err) = window.close()
                    {
                        telemetry::emit_event(
                            "client.tray.exit_failed",
                            LogLevel::Warn,
                            &telemetry::ensure_trace_id(),
                            std::collections::BTreeMap::from([(
                                "message".to_string(),
                                format!("failed to close window before exit: {err}"),
                            )]),
                            "create",
                        );
                    }
                    app.exit(0);
                }
                _ => {
                    telemetry::emit_event(
                        "client.tray.menu_ignored",
                        LogLevel::Debug,
                        &telemetry::ensure_trace_id(),
                        std::collections::BTreeMap::from([(
                            "menu_id".to_string(),
                            event.id.as_ref().to_string(),
                        )]),
                        "create",
                    );
                }
            },
        )
        .build(app)?;

    Ok(())
}

pub fn listener(app: &mut tauri::App) {
    // 监听前端发来的事件
    let app_handle = app.handle().clone();
    app.listen(
        "update-tray-menu",
        move |event| match serde_json::from_str::<TrayMenuItemsPayload>(event.payload()) {
            Ok(payload) => {
                if let Err(e) = update_tray_menu_items(&app_handle, payload) {
                    telemetry::emit_event(
                        "client.tray.update_failed",
                        LogLevel::Error,
                        &telemetry::ensure_trace_id(),
                        std::collections::BTreeMap::from([("message".to_string(), e.to_string())]),
                        "listener",
                    );
                }
            }
            Err(e) => {
                telemetry::emit_event(
                    "client.tray.payload_invalid",
                    LogLevel::Warn,
                    &telemetry::ensure_trace_id(),
                    std::collections::BTreeMap::from([("message".to_string(), e.to_string())]),
                    "listener",
                );
            }
        },
    );
}
