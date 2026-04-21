//! 同步链路 DTO：用于 client <-> tauri <-> server 全链路数据交换。

use crate::dto::api::ValidationDetails;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// 聚合同步数据集。
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct SyncDataDto {
    pub website_groups: Vec<WebsiteGroupDto>,
    pub websites: Vec<WebsitesDto>,
    pub search_engines: Vec<SearchEngineDto>,
}

/// 网站分组 DTO。
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WebsiteGroupDto {
    pub uuid: String,
    pub name: String,
    pub description: Option<String>,
    pub sort_order: Option<i64>,
    pub is_deleted: i64,
    pub rev: i64,
    pub updated_at: String,
}

/// 网站 DTO。
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WebsitesDto {
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
    pub is_deleted: i64,
    pub rev: i64,
    pub updated_at: String,
}

/// 搜索引擎 DTO。
#[cfg_attr(feature = "sqlx", derive(sqlx::FromRow))]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchEngineDto {
    pub uuid: String,
    pub name: String,
    pub url_template: String,
    pub default_icon: Option<String>,
    pub local_icon_path: Option<String>,
    pub is_default: i64,
    pub sort_order: Option<i64>,
    pub is_deleted: i64,
    pub rev: i64,
    pub updated_at: String,
}

/// 客户端完整同步载荷。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClientSyncData {
    pub user_uuid: String,
    pub last_synced_rev: i64,
    pub sync_data: SyncDataDto,
    pub local_icons: Vec<String>,
}

/// 服务端返回的同步结果。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ServerSyncData {
    pub current_synced_rev: i64,
    pub current_synced_at: String,
    pub sync_data: SyncDataDto,
    pub icons_to_upload: Vec<String>,
    pub icons_to_download: Vec<String>,
    pub website_groups_count: usize,
    pub websites_count: usize,
    pub search_engines_count: usize,
}

/// 客户端元信息（版本、鉴权与目标服务）。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClientInfoDto {
    pub app_version: String,
    pub username: String,
    pub token: String,
    pub server_address: String,
}

impl ClientInfoDto {
    /// 执行字段级校验并返回稳定校验码集合。
    pub fn validate_fields(&self) -> ValidationDetails {
        let mut details = ValidationDetails::new();
        if self.app_version.trim().is_empty() {
            details.insert(
                "app_version".to_string(),
                vec!["VALIDATION.APP_VERSION_REQUIRED".to_string()],
            );
        }
        if self.username.trim().is_empty() {
            details.insert(
                "username".to_string(),
                vec!["VALIDATION.USERNAME_REQUIRED".to_string()],
            );
        }
        if self.token.trim().is_empty() {
            details.insert(
                "token".to_string(),
                vec!["VALIDATION.TOKEN_REQUIRED".to_string()],
            );
        }
        if self.server_address.trim().is_empty() {
            details.insert(
                "server_address".to_string(),
                vec!["VALIDATION.SERVER_ADDRESS_REQUIRED".to_string()],
            );
        }
        details
    }
}

/// 开始同步请求体。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClientSyncPayload {
    pub user_uuid: String,
    pub last_synced_rev: i64,
}

impl ClientSyncPayload {
    /// 执行字段级校验并返回稳定校验码集合。
    pub fn validate_fields(&self) -> ValidationDetails {
        let mut details = ValidationDetails::new();
        if self.user_uuid.trim().is_empty() {
            details.insert(
                "user_uuid".to_string(),
                vec!["VALIDATION.USER_UUID_REQUIRED".to_string()],
            );
        }
        details
    }
}

/// 开始同步响应体。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StartSyncResponse {
    pub session_id: String,
    pub server_instance_uuid: String,
    pub suggested_chunk_size: Option<usize>,
}

/// 分块数据类型枚举。
#[derive(Debug, Serialize, Deserialize, Clone, Eq, PartialEq, Hash)]
pub enum DataType {
    WebsiteGroups,
    Websites,
    SearchEngines,
    LocalIcons,
}

/// 同步分块请求体。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClientSyncDataChunk {
    pub session_id: String,
    pub data_type: DataType,
    pub chunk_index: i64,
    pub total_chunks: i64,
    pub chunk_checksum: String,
    pub chunk_data: Value,
}

impl ClientSyncDataChunk {
    /// 执行字段级校验并返回稳定校验码集合。
    pub fn validate_fields(&self) -> ValidationDetails {
        let mut details = ValidationDetails::new();
        if self.session_id.trim().is_empty() {
            details.insert(
                "session_id".to_string(),
                vec!["VALIDATION.SESSION_ID_REQUIRED".to_string()],
            );
        }
        if self.chunk_index < 0 {
            details.insert(
                "chunk_index".to_string(),
                vec!["VALIDATION.CHUNK_INDEX_INVALID".to_string()],
            );
        }
        if self.total_chunks <= 0 {
            details.insert(
                "total_chunks".to_string(),
                vec!["VALIDATION.TOTAL_CHUNKS_INVALID".to_string()],
            );
        }
        if self.chunk_checksum.trim().is_empty() {
            details.insert(
                "chunk_checksum".to_string(),
                vec!["VALIDATION.CHUNK_CHECKSUM_REQUIRED".to_string()],
            );
        }
        details
    }
}

/// 完成同步请求体。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompleteSyncPayload {
    pub session_id: String,
}

impl CompleteSyncPayload {
    /// 执行字段级校验并返回稳定校验码集合。
    pub fn validate_fields(&self) -> ValidationDetails {
        let mut details = ValidationDetails::new();
        if self.session_id.trim().is_empty() {
            details.insert(
                "session_id".to_string(),
                vec!["VALIDATION.SESSION_ID_REQUIRED".to_string()],
            );
        }
        details
    }
}
