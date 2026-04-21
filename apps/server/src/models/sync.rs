// 兼容历史模块路径：server 内部继续使用 `crate::models::sync::*`，
// 实际类型定义统一来自 shared-rs，避免 server/client DTO 漂移。
pub use shared_rs::dto::sync::{
    ClientInfoDto, ClientSyncData, ClientSyncDataChunk, ClientSyncPayload, CompleteSyncPayload,
    DataType, ServerSyncData, StartSyncResponse, SyncDataDto,
};
