use crate::db::pool;
use crate::db::repo::user_repo;
use crate::invokes::sync_apply::SyncApplyLock;
use crate::modules::{logger, telemetry, tray};
use crate::utils::{HttpClientConfig, build_http_client};
use shared_rs::dto::telemetry::LogLevel;
use tauri::{Manager, Runtime};
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

pub trait CustomInit {
    fn init_plugin(self) -> Self;
}

impl<R: Runtime> CustomInit for tauri::Builder<R> {
    fn init_plugin(self) -> Self {
        self
    }
}

pub fn setup(app: &mut tauri::App) {
    if let Err(e) = tray::create(app) {
        telemetry::emit_event(
            "desktop.app.setup_failed",
            LogLevel::Error,
            &telemetry::ensure_trace_id(),
            std::collections::BTreeMap::from([
                ("step".to_string(), "tray_create".to_string()),
                ("message".to_string(), e.to_string()),
            ]),
            "setup",
        );
    }

    tray::listener(app);

    if let Err(e) = logger::init(app) {
        telemetry::emit_event(
            "desktop.app.setup_failed",
            LogLevel::Error,
            &telemetry::ensure_trace_id(),
            std::collections::BTreeMap::from([
                ("step".to_string(), "logger_init".to_string()),
                ("message".to_string(), e.to_string()),
            ]),
            "setup",
        );
    }

    #[cfg(desktop)]
    {
        if let Err(e) = app.handle().plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts(["ctrl+shift+x"])
                .unwrap()
                .with_handler(|app, shortcut, event| {
                    if event.state == ShortcutState::Pressed
                        && shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::KeyX)
                        && let Some(window) = app.get_webview_window("main")
                    {
                        let is_visible = window.is_visible().unwrap();
                        let is_minimized = window.is_minimized().unwrap();
                        let is_focused = window.is_focused().unwrap();

                        if !is_visible {
                            // 窗口是隐藏的 → 显示并聚焦
                            window.show().unwrap();
                            window.unminimize().unwrap();
                            window.set_focus().unwrap();
                        } else if is_minimized {
                            // 窗口最小化 → 恢复显示
                            window.unminimize().unwrap();
                            window.set_focus().unwrap();
                        } else {
                            // 窗口不是隐藏或最小化 → 聚焦
                            if !is_focused {
                                window.set_focus().unwrap();
                            } else {
                                // 窗口是聚焦时 → 最小化
                                window.minimize().unwrap();
                            }
                        }
                    };
                })
                .build(),
        ) {
            telemetry::emit_event(
                "desktop.app.shortcut_failed",
                LogLevel::Warn,
                &telemetry::ensure_trace_id(),
                std::collections::BTreeMap::from([(
                    "message".to_string(),
                    format!("global shortcut could not be bound; it may already be in use: {e}"),
                )]),
                "setup",
            );
        };
    }

    telemetry::emit_event(
        "desktop.app.setup_completed",
        LogLevel::Info,
        &telemetry::ensure_trace_id(),
        std::collections::BTreeMap::new(),
        "setup",
    );
}

pub fn manage(app: &mut tauri::App) {
    let client = build_http_client(HttpClientConfig::builder()).unwrap();
    app.manage(client);
    let db_pool = tauri::async_runtime::block_on(async {
        let db_pool = pool::init(app).await?;
        user_repo::init_local_db(db_pool.inner()).await?;
        Ok::<_, crate::db::error::DbError>(db_pool)
    })
    .unwrap_or_else(|err| panic!("Failed to initialize sqlx sqlite pool: {err:?}"));
    app.manage(db_pool);
    app.manage(SyncApplyLock::default());

    telemetry::emit_event(
        "desktop.app.state_ready",
        LogLevel::Info,
        &telemetry::ensure_trace_id(),
        std::collections::BTreeMap::new(),
        "manage",
    );
}
