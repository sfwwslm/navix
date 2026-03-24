use log::LevelFilter;
use tauri_plugin_log::{Target, TargetKind};

pub fn init(app: &tauri::App) -> tauri::Result<()> {
    let log_plugin = tauri_plugin_log::Builder::new()
        .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
        .targets([
            Target::new(TargetKind::Stdout),
            Target::new(TargetKind::LogDir { file_name: None }),
            Target::new(TargetKind::Webview),
        ])
        .level(LevelFilter::Info)
        // https://github.com/tauri-apps/tauri/issues/8494 2025年7月22日 未解决
        // 抑制 tao::platform_impl::platform::event 警告的日志
        .filter(|metadata| metadata.target() != "tao::platform_impl::platform::event_loop::runner")
        .build();

    app.handle().plugin(log_plugin).unwrap();
    Ok(())
}
