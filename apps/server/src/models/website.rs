use serde::{Deserialize, Serialize};
use shared_rs::dto::api::ValidationDetails;
pub use shared_rs::dto::sync::{WebsiteGroupDto, WebsitesDto};

/// 网站分组结构体，对应数据库中的 `website_groups` 表
#[derive(Debug, sqlx::FromRow, Serialize, Deserialize)]
pub struct WebsiteGroupEntity {
    pub id: i64,
    pub uuid: String,
    pub user_uuid: String,
    pub name: String,
    pub description: Option<String>,
    pub sort_order: Option<i64>,
    pub is_deleted: i64,
    pub rev: i64,
    pub created_at: String,
    pub updated_at: String,
}

/// 网站结构体，对应数据库中的 `website_items` 表
#[derive(Debug, sqlx::FromRow, Serialize, Deserialize)]
pub struct WebsiteEntity {
    pub id: i64,
    pub uuid: String,
    pub user_uuid: String,
    pub group_uuid: String,
    pub title: String,
    pub url: String,
    pub url_lan: Option<String>,
    pub default_icon: Option<String>,
    pub local_icon_path: Option<String>,
    pub description: Option<String>,
    pub background_color: Option<String>,
    pub sort_order: Option<i64>,
    pub is_deleted: i64,
    pub rev: i64,
    pub created_at: String,
    pub updated_at: String,
}

/// 用于导航展示的简化网站数据
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NavigationWebsite {
    pub uuid: String,
    pub group_uuid: String,
    pub title: String,
    pub url: String,
    pub url_lan: Option<String>,
    pub default_icon: Option<String>,
    pub local_icon_path: Option<String>,
    pub background_color: Option<String>,
    pub description: Option<String>,
    pub sort_order: Option<i64>,
}

/// 用于导航展示的分组数据（包含网站列表）
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NavigationGroup {
    pub uuid: String,
    pub name: String,
    pub description: Option<String>,
    pub sort_order: Option<i64>,
    pub websites: Vec<NavigationWebsite>,
}

/// Web 端更新导航站点时提交的请求体。
#[derive(Debug, Deserialize)]
pub struct UpdateWebsitePayload {
    pub title: String,
    pub url: String,
    pub url_lan: Option<String>,
    pub group_uuid: String,
    pub default_icon: Option<String>,
    pub description: Option<String>,
    pub background_color: Option<String>,
}

impl UpdateWebsitePayload {
    /// 执行字段级校验并返回稳定校验码集合。
    pub fn validate_fields(&self) -> ValidationDetails {
        let mut details = ValidationDetails::new();

        if self.title.trim().is_empty() {
            details.insert(
                "title".to_string(),
                vec!["VALIDATION.TITLE_REQUIRED".to_string()],
            );
        }

        if self.url.trim().is_empty() {
            details.insert(
                "url".to_string(),
                vec!["VALIDATION.URL_REQUIRED".to_string()],
            );
        } else if !looks_like_http_url(&self.url) {
            details.insert(
                "url".to_string(),
                vec!["VALIDATION.URL_INVALID".to_string()],
            );
        }

        if let Some(url_lan) = &self.url_lan
            && !url_lan.trim().is_empty()
            && !looks_like_http_url(url_lan)
        {
            details.insert(
                "url_lan".to_string(),
                vec!["VALIDATION.URL_LAN_INVALID".to_string()],
            );
        }

        if self.group_uuid.trim().is_empty() {
            details.insert(
                "group_uuid".to_string(),
                vec!["VALIDATION.GROUP_UUID_REQUIRED".to_string()],
            );
        }

        details
    }
}

/// 粗粒度判断 URL 是否为常见的 HTTP/HTTPS 地址。
fn looks_like_http_url(value: &str) -> bool {
    value.starts_with("http://") || value.starts_with("https://")
}
