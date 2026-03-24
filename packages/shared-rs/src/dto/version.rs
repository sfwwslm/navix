use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VersionInfo {
    pub version: String,
    pub commit_hash: String,
    pub build_time: String,
    pub build_env: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompatibilityInfo {
    pub server_version: String,
    pub min_client_version: String,
    pub recommended_client_version: String,
    pub sync_protocol_current: u32,
    pub sync_protocol_min_client: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClientCompatibilityRequest {
    pub app_version: String,
    pub sync_protocol: u32,
}
