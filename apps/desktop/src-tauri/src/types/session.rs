use serde::{Deserialize, Serialize};
pub use shared_rs::dto::auth::CurrentUserPayload;

// 定义前端传来的 User 结构
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub uuid: String,
    pub username: String,
    pub is_logged_in: i32,
    pub server_address: Option<String>,
    pub server_instance_uuid: Option<String>,
    pub token: Option<String>,
}
