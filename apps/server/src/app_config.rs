/// 应用配置中心。
///
/// Alpha 阶段先使用常量模块集中管理，后续如需热更新可再迁移到外部配置文件。
#[derive(Debug, Clone, Copy)]
pub struct AppConfig {
    pub compat: CompatConfig,
    pub observability: ObservabilityConfig,
}

#[derive(Debug, Clone, Copy)]
pub struct CompatConfig {
    pub min_client_version: &'static str,
    pub recommended_client_version: &'static str,
    pub sync_protocol_current: u32,
    pub sync_protocol_min_client: u32,
}

#[derive(Debug, Clone, Copy)]
pub struct ObservabilityConfig {
    pub emit_compat_audit_log: bool,
}

pub const APP_CONFIG: AppConfig = AppConfig {
    compat: CompatConfig {
        // 同步多字段/日志/会话持久化改动后的最低客户端版本要求
        min_client_version: "0.1.0-alpha.1",
        // 当前建议升级到的客户端版本
        recommended_client_version: "0.1.0-alpha.1",
        // 当前服务端实现的同步协议版本
        sync_protocol_current: 1,
        // 允许接入的最低客户端同步协议版本
        sync_protocol_min_client: 1,
    },
    observability: ObservabilityConfig {
        emit_compat_audit_log: true,
    },
};
