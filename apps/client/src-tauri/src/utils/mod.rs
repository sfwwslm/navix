use crate::types::{APP_CONFIG_DIR, APP_DATA_DIR, HOME_VUST_DIR};
use std::{path::PathBuf, str::FromStr};
use tauri::Manager;

use std::collections::HashMap;
use std::time::Duration;
use tauri_plugin_http::reqwest::{Client, header};

/// 获取应用配置目录路径 `~/.vust/navix`
pub fn app_config_dir_path(app: &tauri::App) -> PathBuf {
    app.path()
        .home_dir()
        .unwrap()
        .join(HOME_VUST_DIR)
        .join(APP_CONFIG_DIR)
}

/// 获取应用数据目录路径 `~/.vust/navix/data`
pub fn app_data_dir_path(app: &tauri::App) -> PathBuf {
    app_config_dir_path(app).join(APP_DATA_DIR)
}

/// HTTP 客户端配置。
///
/// 支持设置超时、自定义请求头、认证 Token 等。
///
/// # 字段
/// - `timeout`: 请求超时时间（默认 30 秒）。
/// - `headers`: 自定义请求头。
/// - `token`: 认证 Token（默认无）。
///
/// # 用法示例
/// ```rust
/// use navix_lib::utils::HttpClientConfig;
/// use std::time::Duration;
///
/// let config = HttpClientConfig::builder()
///     .set_token("Bearer xxx".into())
///     .set_timeout(Duration::from_secs(5))
///     .add_header("X-Trace-Id".into(), "12345".into());
///
/// assert!(config.token.is_some());
/// ```
pub struct HttpClientConfig {
    pub timeout: Option<Duration>,
    pub headers: Option<HashMap<String, String>>,
    pub token: Option<String>,
}

impl HttpClientConfig {
    /// 创建一个带默认值的配置。
    pub fn builder() -> Self {
        HttpClientConfig {
            timeout: Some(Duration::from_secs(30)),
            headers: None,
            token: None,
        }
    }
    /// 设置认证 Token。
    pub fn set_token(mut self, token: String) -> Self {
        self.token = Some(token);
        self
    }

    /// 设置请求超时时间。
    pub fn set_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = Some(timeout);
        self
    }

    /// 添加一个自定义请求头。
    pub fn add_header(mut self, key: String, value: String) -> Self {
        self.headers
            .get_or_insert_with(HashMap::new)
            .insert(key, value);
        self
    }
}

/// 构建一个带有可选认证信息和自定义请求头的 HTTP 客户端。
///
/// # 参数
/// - `http_config`: 客户端配置，包括：
///   - `token`: 可选的认证 Token（会作为 `Authorization` 头部加入请求）。
///   - `headers`: 可选的自定义请求头（键值对形式）。
///   - `timeout`: 可选的超时时间（默认 10 秒）。
///
/// # 返回值
/// - 成功时返回 [`reqwest::Client`]。
/// - 失败时返回 `Err(String)`，包含详细错误信息（如 header 格式错误或客户端构建失败）。
///
/// # 特性
/// - 会自动设置默认请求头（如 `Authorization` 和自定义 headers）。
/// - 默认超时为 10 秒（可通过配置覆盖）。
/// - 默认接受不安全的证书（`danger_accept_invalid_certs(true)`）。
///
/// # 示例
/// ```rust
/// use navix_lib::utils::{build_http_client, HttpClientConfig};
/// use std::time::Duration;
///
/// let config = HttpClientConfig::builder()
///     .set_token("Bearer abc123".to_string())
///     .set_timeout(Duration::from_secs(10))
///     .add_header("X-Custom-Header".into(), "Value".into());
///
/// let client = build_http_client(config).expect("client should be created");
/// let _request = client.get("https://example.com");
/// ```
pub fn build_http_client(http_config: HttpClientConfig) -> Result<Client, String> {
    let mut headers = header::HeaderMap::new();
    headers.insert(
        header::USER_AGENT,
        header::HeaderValue::from_str("navix-client").unwrap(),
    );

    // 添加 token
    if let Some(token) = http_config.token {
        headers.insert(
            header::AUTHORIZATION,
            header::HeaderValue::from_str(&token).map_err(|e| format!("无效的 token 格式: {e}"))?,
        );
    }

    // 添加自定义 header
    if let Some(custom_headers) = http_config.headers {
        for (key, value) in custom_headers {
            let name = header::HeaderName::from_str(&key)
                .map_err(|e| format!("无效的 header 名称 `{key}`: {e}"))?;
            let val = header::HeaderValue::from_str(&value)
                .map_err(|e| format!("无效的 header 值 `{value}`: {e}"))?;
            headers.insert(name, val);
        }
    }

    let timeout = http_config
        .timeout
        .unwrap_or_else(|| Duration::from_secs(10));

    Client::builder()
        .default_headers(headers)
        .timeout(timeout)
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("构建 HTTP 客户端失败: {e}"))
}
