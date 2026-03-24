use crate::types::{APP_CONFIG_DIR, HOME_VUST_DIR};
use log::{error, info, warn};
use scraper::{Html, Selector};
use sha2::{Digest, Sha256};
use std::fs::{self, create_dir_all};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_http::reqwest::{Client, StatusCode, header};
use url::Url;

/// 定义了要返回给前端的网站元数据结构
#[derive(serde::Serialize)]
pub struct WebsiteMetadata {
    title: Option<String>,
    local_icon_path: Option<String>,
}

/// 这是一个同步函数，负责所有非线程安全的HTML解析工作。
///
/// ## 为什么要这样做？
/// `scraper::Html` 类型不是 `Send`，意味着它不能被安全地在线程之间传递。
/// 在一个 `async` 函数中，任何跨越 `.await` 点的局部变量都可能被移动到另一个线程，
/// 这会导致编译器报错 "future cannot be sent between threads safely"。
///
/// 通过将所有 `scraper` 相关的操作（如 `Html::parse_document` 和 `document.select`）
/// 封装在这个纯同步的函数中，确保非 `Send` 的 `Html` 对象
/// 的整个生命周期都在一个单一的、不间断的执行块内，从而避免了线程安全问题。
///
/// 接收一个 `String` 类型的 `body`（它是 `Send` 的），然后返回提取出的
/// `Option<String>` 类型的数据（它们也是 `Send` 的），这些安全的数据可以在主异步函数中自由地跨越 `.await`。
fn parse_metadata_from_body(body: &str, base_url: &str) -> (Option<String>, Option<String>) {
    let document = Html::parse_document(body);

    // Get Title
    let title_selector = Selector::parse("title").unwrap();
    let mut title = document
        .select(&title_selector)
        .next()
        .map(|element| element.inner_html().trim().to_string());

    if let Some(t) = &title {
        if t.is_empty() {
            let url = Url::parse(base_url).expect("Invalid URL");
            let host = url.host_str().unwrap().to_string();
            warn!("Title is empty (length = 0), fallback to host: {host}");
            title = Some(host);
        } else {
            info!("Found title: {t}");
        }
    }

    // Get Favicon URL
    let favicon_url = find_favicon_url(&document, base_url);

    (title, favicon_url)
}

/// 从给定的URL抓取网站的标题和图标
#[tauri::command]
pub async fn fetch_website_metadata(
    app: AppHandle,
    url: String,
    http_client: tauri::State<'_, Client>,
) -> Result<WebsiteMetadata, String> {
    info!("Fetching metadata for URL: {url}");

    let (final_url, body) = fetch_body_with_redirects(&http_client, &url).await?;

    // 调用同步函数来处理HTML解析，获取线程安全的数据。
    let (title, favicon_url) = parse_metadata_from_body(&body, &final_url);

    let local_icon_path = if let Some(fav_url) = favicon_url {
        info!("Found favicon URL: {fav_url}");
        match download_favicon(&app, &http_client, &fav_url).await {
            Ok(file_name) => {
                info!("Successfully downloaded favicon to: {file_name:?}");
                Some(file_name)
            }
            Err(e) => {
                error!("Failed to download favicon from {fav_url}: {e}");
                return Err(format!("Failed to download favicon from {fav_url}: {e}"));
            }
        }
    } else {
        info!("No favicon URL found for {url}");
        return Err(format!("No favicon URL found for {url}"));
    };

    Ok(WebsiteMetadata {
        title,
        local_icon_path,
    })
}

/// 请求URL并处理HTTP 3xx与HTML meta refresh重定向。
async fn fetch_body_with_redirects(
    http_client: &Client,
    initial_url: &str,
) -> Result<(String, String), String> {
    let mut current_url = initial_url.to_string();
    let mut redirect_count = 0usize;
    let max_redirects = 5usize;

    loop {
        if redirect_count > max_redirects {
            return Err(format!(
                "Too many redirects (>{max_redirects}) for {initial_url}"
            ));
        }

        let response = http_client
            .get(&current_url)
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await
            .map_err(|e| format!("Request failed for {current_url}: {e}"))?;

        let status = response.status();

        if status.is_redirection() {
            if let Some(location) = response.headers().get(header::LOCATION)
                && let Ok(location) = location.to_str()
                && let Some(next_url) = resolve_redirect_url(&current_url, location)
            {
                warn!(
                    "HTTP redirect {} -> {} (status {})",
                    current_url, next_url, status
                );
                current_url = next_url;
                redirect_count += 1;
                continue;
            }

            return Err(format!(
                "Redirect status without valid Location header: {}",
                status
            ));
        }

        if status.is_success() {
            // OK
        } else if status == StatusCode::FORBIDDEN && allow_403_for(&current_url) {
            // 特定 URL 允许 403
            warn!("Received 403 but allowed by policy {current_url}");
        } else {
            return Err(format!("Request failed with status: {}", status));
        }

        let body = response.text().await.map_err(|e| e.to_string())?;

        if let Some(meta_refresh_url) = find_meta_refresh_url(&body, &current_url) {
            warn!(
                "Meta refresh redirect {} -> {}",
                current_url, meta_refresh_url
            );
            current_url = meta_refresh_url;
            redirect_count += 1;
            continue;
        }

        return Ok((current_url, body));
    }
}

fn resolve_redirect_url(base_url: &str, location: &str) -> Option<String> {
    let trimmed = location.trim();
    if trimmed.is_empty() {
        return None;
    }
    if let Ok(url) = Url::parse(trimmed) {
        return Some(url.to_string());
    }
    let base = Url::parse(base_url).ok()?;
    base.join(trimmed).ok().map(|url| url.to_string())
}

/// 查找HTML中的<meta http-equiv="refresh" ...>重定向URL。
fn find_meta_refresh_url(body: &str, base_url: &str) -> Option<String> {
    let document = Html::parse_document(body);
    let selector = Selector::parse("meta[http-equiv]").ok()?;

    for element in document.select(&selector) {
        let equiv = element.value().attr("http-equiv").unwrap_or("");
        if !equiv.eq_ignore_ascii_case("refresh") {
            continue;
        }

        let content = element.value().attr("content").unwrap_or("").trim();
        if content.is_empty() {
            continue;
        }

        if let Some(url_part) = extract_refresh_url(content)
            && let Some(resolved) = resolve_redirect_url(base_url, &url_part)
        {
            return Some(resolved);
        }
    }

    None
}

fn extract_refresh_url(content: &str) -> Option<String> {
    let lower = content.to_lowercase();
    let pos = lower.find("url=")?;
    let after = &content[pos + 4..];
    let trimmed = after.trim().trim_matches('"').trim_matches('\'');
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn allow_403_for(url: &str) -> bool {
    let url = Url::parse(url).ok().unwrap();
    let path = url.path();
    matches!(path, "/cgi-bin/luci/" | "/cgi-bin/luci/admin/status")
}

/// 在HTML文档中查找最合适的`favicon URL`
fn find_favicon_url(document: &Html, base_url_str: &str) -> Option<String> {
    let base_url = Url::parse(base_url_str).ok()?;

    let selectors = [
        "link[rel='icon']",
        "link[rel='apple-touch-icon']",
        "link[rel='shortcut icon']",
    ];

    for selector in selectors.iter() {
        if let Some(element) = document.select(&Selector::parse(selector).unwrap()).next()
            && let Some(href) = element.value().attr("href")
            && !href.trim().is_empty()
            && let Ok(absolute_url) = base_url.join(href.trim())
        {
            return Some(absolute_url.to_string());
        }
    }

    // Fallback to /favicon.ico
    base_url
        .join("/favicon.ico")
        .ok()
        .map(|url| url.to_string())
}

/// 下载`favicon`并保存到本地
async fn download_favicon(
    app: &AppHandle,
    http_client: &Client,
    url: &str,
) -> Result<String, String> {
    let response = http_client
        .get(url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!(
            "Favicon request failed with status {}",
            response.status()
        ));
    }

    let headers = response.headers().clone();
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;

    // 基于图片内容进行哈希
    let mut hasher = Sha256::new();
    hasher.update(&bytes); // 对下载的字节内容进行哈希
    let result = hasher.finalize();
    let hash_hex = hex::encode(result);

    // 推断文件扩展名
    let extension = get_extension_from_headers(headers)
        .or_else(|| get_extension_from_url(url))
        .unwrap_or("png");

    let file_name = format!("{}.{}", &hash_hex[..16], extension);

    // 保存文件
    let icons_dir = app
        .path()
        .home_dir()
        .unwrap()
        .join(HOME_VUST_DIR)
        .join(APP_CONFIG_DIR)
        .join("icons");
    if !icons_dir.exists() {
        create_dir_all(&icons_dir).map_err(|e| e.to_string())?;
    }

    let file_path = icons_dir.join(&file_name);

    // 如果文件已存在，则跳过写入，节省磁盘IO
    if !file_path.exists() {
        fs::write(&file_path, &bytes).map_err(|e| e.to_string())?;
        info!("Saved new icon: {file_name}");
    } else {
        info!("Icon already exists, skipping write: {file_name}");
    }

    Ok(file_name)
}

/// 从HTTP响应头中推断文件扩展名
fn get_extension_from_headers(headers: header::HeaderMap) -> Option<&'static str> {
    if let Some(content_type) = headers.get(header::CONTENT_TYPE)
        && let Ok(ct) = content_type.to_str()
    {
        return match ct {
            ct if ct.contains("image/png") => Some("png"),
            ct if ct.contains("image/x-icon") | ct.contains("image/vnd.microsoft.icon") => {
                Some("ico")
            }
            ct if ct.contains("image/svg+xml") => Some("svg"),
            ct if ct.contains("image/jpeg") => Some("jpg"),
            ct if ct.contains("image/gif") => Some("gif"),
            _ => None,
        };
    }
    None
}

/// 从URL路径中推断文件扩展名
fn get_extension_from_url(url: &str) -> Option<&'static str> {
    let path = Url::parse(url).ok()?.path().to_lowercase();
    if path.ends_with(".png") {
        Some("png")
    } else if path.ends_with(".ico") {
        Some("ico")
    } else if path.ends_with(".svg") {
        Some("svg")
    } else if path.ends_with(".jpg") || path.ends_with(".jpeg") {
        Some("jpg")
    } else if path.ends_with(".gif") {
        Some("gif")
    } else {
        None
    }
}

/// 保存用户上传的图标文件到应用的图标目录。
///
/// 该函数会读取给定路径的文件内容，计算其 SHA256 哈希值，
/// 并使用哈希值和原始扩展名重命名后保存。
/// 这可以防止文件名冲突和重复存储相同内容的图片。
#[tauri::command]
pub async fn save_uploaded_icon(app: AppHandle, path: PathBuf) -> Result<String, String> {
    info!("正在处理上传的图标: {path:?}");

    // 读取文件内容
    let bytes = fs::read(&path).map_err(|e| format!("读取上传的文件失败: {e}"))?;

    // 计算文件内容的哈希值
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let result = hasher.finalize();
    let hash_hex = hex::encode(result);

    // 从原始路径获取文件扩展名
    let extension = path
        .extension()
        .and_then(std::ffi::OsStr::to_str)
        .unwrap_or("png") // 如果没有扩展名则默认为 png
        .to_lowercase();

    let file_name = format!("{}.{}", &hash_hex[..16], extension);

    // 4. 获取应用图标目录的路径
    let icons_dir = app
        .path()
        .home_dir()
        .unwrap()
        .join(HOME_VUST_DIR)
        .join(APP_CONFIG_DIR)
        .join("icons");
    if !icons_dir.exists() {
        create_dir_all(&icons_dir).map_err(|e| e.to_string())?;
    }

    let file_path = icons_dir.join(&file_name);

    // 如果文件不存在，则写入文件
    if !file_path.exists() {
        fs::write(&file_path, &bytes).map_err(|e| e.to_string())?;
        info!("已保存新的上传图标: {file_name}");
    } else {
        info!("上传的图标已存在，跳过写入: {file_name}");
    }

    // 只返回文件名字符串
    Ok(file_name)
}
