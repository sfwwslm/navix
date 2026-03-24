use serde::{Deserialize, Serialize};
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
