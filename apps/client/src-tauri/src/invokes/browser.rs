//! 该模块提供与系统浏览器交互相关的功能，检测已安装的浏览器。

#[cfg(any(target_os = "windows", target_os = "macos"))]
use std::path::PathBuf;

#[cfg(target_os = "linux")]
use std::process::Command;

/// 定义支持的浏览器及其相关信息
#[derive(serde::Serialize, Clone, Debug)]
pub struct Browser {
    /// 浏览器的唯一标识符 (用于 `open` 命令)
    id: &'static str,
    /// 浏览器的显示名称
    name: &'static str,
    /// 浏览器是否被检测到已安装
    installed: bool,
}

/// [Tauri Command] 检测当前操作系统上安装了哪些主流浏览器。
///
/// ## 平台特定逻辑:
/// - **Windows**: 检查 `Program Files` 目录下是否存在主流浏览器的可执行文件。
/// - **macOS**: 检查 `/Applications` 目录下是否存在主流浏览器的 `.app` 包。
/// - **Linux**: 依赖 `which` 命令在 `PATH` 中查找浏览器可执行文件。
///
/// # Returns
/// * `Vec<Browser>` - 一个包含所有支持的浏览器及其安装状态的列表。
#[tauri::command]
pub async fn detect_installed_browsers() -> Vec<Browser> {
    let mut browsers = vec![
        Browser {
            id: "chrome",
            name: "Google Chrome",
            installed: false,
        },
        Browser {
            id: "msedge",
            name: "Microsoft Edge",
            installed: false,
        },
        Browser {
            id: "firefox",
            name: "Mozilla Firefox",
            installed: false,
        },
    ];

    for browser in &mut browsers {
        browser.installed = check_installation(browser).await;
    }

    browsers
}

async fn check_installation(browser: &Browser) -> bool {
    #[cfg(target_os = "windows")]
    {
        check_windows_installations(browser.id)
    }
    #[cfg(target_os = "macos")]
    {
        check_macos_installations(browser.name)
    }
    #[cfg(target_os = "linux")]
    {
        check_linux_installations(browser.id).await
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        // 其他不支持的系统
        false
    }
}

#[cfg(target_os = "windows")]
fn check_windows_installations(id: &str) -> bool {
    let executable_name = match id {
        "chrome" => "chrome.exe",
        "msedge" => "msedge.exe",
        "firefox" => "firefox.exe",
        _ => return false,
    };

    let program_files = std::env::var("ProgramFiles").unwrap_or_default();
    let program_files_x86 = std::env::var("ProgramFiles(x86)").unwrap_or_default();

    let paths_to_check: Vec<PathBuf> = vec![
        PathBuf::from(&program_files)
            .join(match id {
                "chrome" => "Google\\Chrome\\Application",
                "msedge" => "Microsoft\\Edge\\Application",
                "firefox" => "Mozilla Firefox",
                _ => "",
            })
            .join(executable_name),
        PathBuf::from(&program_files_x86)
            .join(match id {
                "chrome" => "Google\\Chrome\\Application",
                "msedge" => "Microsoft\\Edge\\Application",
                "firefox" => "Mozilla Firefox",
                _ => "",
            })
            .join(executable_name),
    ];

    paths_to_check.iter().any(|path| path.exists())
}

#[cfg(target_os = "macos")]
fn check_macos_installations(name: &str) -> bool {
    PathBuf::from("/Applications")
        .join(format!("{}.app", name))
        .exists()
}

#[cfg(target_os = "linux")]
async fn check_linux_installations(id: &str) -> bool {
    let command = match id {
        "chrome" => "google-chrome",
        "msedge" => "microsoft-edge",
        "firefox" => "firefox",
        _ => id,
    };

    // 调用 `which` 命令检查可执行文件
    let status = Command::new("which").arg(command).status();

    match status {
        Ok(status) => status.success(),
        Err(_) => false,
    }
}
