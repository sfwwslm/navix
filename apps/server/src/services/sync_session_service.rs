use crate::models::sync::{DataType, SyncDataDto};
use anyhow::{Result, anyhow};
use dashmap::DashMap;
use serde_json::Value;
use std::collections::{BTreeMap, HashMap};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Default, Debug, Clone)]
pub struct ChunkBuffer {
    pub total_chunks: usize,
    pub chunks: BTreeMap<usize, Value>,
}

/// 表示一个正在进行的同步会话
#[derive(Default, Debug, Clone)]
pub struct SyncSession {
    pub user_uuid: String,
    pub last_synced_rev: i64,
    pub chunks: HashMap<DataType, ChunkBuffer>,
}

/// 线程安全的会话管理器，用于在内存中存储所有活跃的同步会话
#[derive(Clone, Default)]
pub struct SessionManager {
    // Key: session_id, Value: SyncSession
    sessions: Arc<DashMap<String, SyncSession>>,
}

impl SessionManager {
    /// 创建一个新的会话管理器实例
    pub fn new() -> Self {
        SessionManager::default()
    }

    /// 开启一个新的同步会话
    pub fn start_session(&self, user_uuid: String, last_synced_rev: i64) -> String {
        let session_id = Uuid::new_v4().to_string();
        let session = SyncSession {
            user_uuid,
            last_synced_rev,
            chunks: HashMap::new(),
        };
        self.sessions.insert(session_id.clone(), session);
        tracing::info!(
            "开启新同步会话: Session ID = {}, User UUID = {}",
            session_id,
            "..."
        );
        session_id
    }

    /// 向指定会话添加一个数据块
    pub fn add_chunk(
        &self,
        session_id: &str,
        data_type: DataType,
        chunk_index: usize,
        total_chunks: usize,
        chunk_data: Value,
    ) -> Result<()> {
        if total_chunks == 0 {
            return Err(anyhow!("total_chunks 必须大于 0"));
        }
        if chunk_index >= total_chunks {
            return Err(anyhow!(
                "chunk_index 越界: index={}, total={}",
                chunk_index,
                total_chunks
            ));
        }

        let mut session = self
            .sessions
            .get_mut(session_id)
            .ok_or_else(|| anyhow!("会话 ID '{}' 无效或已过期", session_id))?;

        let buffer = session.chunks.entry(data_type).or_default();
        if buffer.total_chunks == 0 {
            buffer.total_chunks = total_chunks;
        } else if buffer.total_chunks != total_chunks {
            return Err(anyhow!(
                "同一数据类型 total_chunks 不一致: expect={}, got={}",
                buffer.total_chunks,
                total_chunks
            ));
        }

        // 使用 chunk_index 覆盖写入，支持幂等重试与乱序分块。
        buffer.chunks.insert(chunk_index, chunk_data);
        Ok(())
    }

    /// 获取某个会话某种数据类型已接收的分块数量（用于持久化索引）
    pub fn get_chunk_count(&self, session_id: &str, data_type: &DataType) -> usize {
        self.sessions
            .get(session_id)
            .and_then(|s| s.chunks.get(data_type).map(|v| v.chunks.len()))
            .unwrap_or(0)
    }

    /// 读取某个会话并组装数据（不消费会话），失败时支持重试 complete。
    pub fn build_session_data(
        &self,
        session_id: &str,
    ) -> Result<(SyncSession, SyncDataDto, Vec<String>)> {
        let session = self
            .sessions
            .get(session_id)
            .ok_or_else(|| anyhow!("会话 ID '{}' 无效或已完成", session_id))?;
        let session = session.clone();

        tracing::info!("组装同步会话数据: Session ID = {}", session_id);

        let mut all_data = SyncDataDto::default();
        let mut local_icons: Vec<String> = Vec::new();

        for (data_type, buffer) in &session.chunks {
            if buffer.chunks.len() != buffer.total_chunks {
                return Err(anyhow!(
                    "分块不完整: type={:?}, received={}, expected={}",
                    data_type,
                    buffer.chunks.len(),
                    buffer.total_chunks
                ));
            }

            // 将所有块合并到一个 Vec<Value> 中
            let mut flattened_values: Vec<Value> = Vec::new();
            for index in 0..buffer.total_chunks {
                let chunk = buffer
                    .chunks
                    .get(&index)
                    .ok_or_else(|| anyhow!("分块缺失: type={:?}, index={}", data_type, index))?;
                let arr = chunk.as_array().ok_or_else(|| {
                    anyhow!("分块格式错误: type={:?}, index={}", data_type, index)
                })?;
                flattened_values.extend(arr.clone());
            }
            let combined_value = Value::Array(flattened_values);

            // 根据数据类型反序列化到最终的 DTO 结构中
            match data_type {
                DataType::WebsiteGroups => {
                    all_data.website_groups = serde_json::from_value(combined_value)?;
                }
                DataType::Websites => {
                    all_data.websites = serde_json::from_value(combined_value)?;
                }
                DataType::SearchEngines => {
                    all_data.search_engines = serde_json::from_value(combined_value)?;
                }
                DataType::LocalIcons => local_icons = serde_json::from_value(combined_value)?,
            }
        }

        Ok((session, all_data, local_icons))
    }

    /// 结束会话（消费内存态）。
    pub fn finish_session(&self, session_id: &str) -> Result<()> {
        let (session_id_owned, _) = self
            .sessions
            .remove(session_id)
            .ok_or_else(|| anyhow!("会话 ID '{}' 无效或已完成", session_id))?;
        tracing::info!("完成同步会话: Session ID = {}", session_id_owned);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::SessionManager;
    use crate::models::sync::DataType;
    use serde_json::json;

    #[test]
    fn out_of_order_and_duplicate_chunks_are_merged_by_index() {
        let manager = SessionManager::new();
        let session_id = manager.start_session("user-1".to_string(), 0);

        manager
            .add_chunk(
                &session_id,
                DataType::LocalIcons,
                1,
                2,
                json!(["icon-b-v1.png"]),
            )
            .expect("add chunk #1");
        manager
            .add_chunk(
                &session_id,
                DataType::LocalIcons,
                0,
                2,
                json!(["icon-a.png"]),
            )
            .expect("add chunk #0");
        // 重复分块索引：应覆盖旧值（幂等重试）。
        manager
            .add_chunk(
                &session_id,
                DataType::LocalIcons,
                1,
                2,
                json!(["icon-b-v2.png"]),
            )
            .expect("overwrite chunk #1");

        let (_, _, icons) = manager
            .build_session_data(&session_id)
            .expect("build session data");
        assert_eq!(
            icons,
            vec!["icon-a.png".to_string(), "icon-b-v2.png".to_string()]
        );
    }

    #[test]
    fn complete_data_build_is_retryable_until_finish() {
        let manager = SessionManager::new();
        let session_id = manager.start_session("user-2".to_string(), 123);

        manager
            .add_chunk(&session_id, DataType::LocalIcons, 0, 1, json!(["x.png"]))
            .expect("add chunk");

        // 首次 complete 组装成功
        let first = manager
            .build_session_data(&session_id)
            .expect("first build should succeed");
        assert_eq!(first.0.last_synced_rev, 123);

        // 失败重试场景：会话不被消费，仍可再次组装
        let second = manager
            .build_session_data(&session_id)
            .expect("second build should still succeed");
        assert_eq!(second.2, vec!["x.png".to_string()]);

        // 仅在显式 finish 后会话被消费
        manager
            .finish_session(&session_id)
            .expect("finish session should succeed");
        assert!(manager.build_session_data(&session_id).is_err());
    }
}
