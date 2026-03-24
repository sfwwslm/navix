use chrono::Utc;
use serde_json::Value;
use shared_rs::dto::telemetry::{
    LogLevel, ObservabilityEvent, TelemetryActor, TelemetryContext, TelemetryMetrics,
    TelemetryRecord, TelemetryResult, TelemetryResultStatus, TelemetrySource, TelemetrySourceLayer,
};
use std::collections::BTreeMap;
use uuid::Uuid;

// server 侧兜底脱敏键；与 shared-ts 的敏感字段集合保持同构。
const SENSITIVE_KEYS: [&str; 5] = [
    "token",
    "refresh_token",
    "password",
    "authorization",
    "cookie",
];

fn current_env() -> String {
    std::env::var("NAVIX_ENV")
        .or_else(|_| std::env::var("APP_ENV"))
        .unwrap_or_else(|_| "local".to_string())
}

pub fn new_event_id() -> String {
    Uuid::new_v4().as_simple().to_string()
}

pub fn json_payload(entries: impl IntoIterator<Item = (String, Value)>) -> BTreeMap<String, Value> {
    entries.into_iter().collect()
}

pub fn string_payload(
    entries: impl IntoIterator<Item = (String, String)>,
) -> BTreeMap<String, Value> {
    entries
        .into_iter()
        .map(|(key, value)| (key, Value::String(value)))
        .collect()
}

pub fn build_server_record(
    event: ObservabilityEvent,
    level: LogLevel,
    app_version: &str,
) -> TelemetryRecord {
    build_server_record_raw(event.as_str(), level, app_version)
}

pub fn build_server_record_raw(
    event_name: &str,
    level: LogLevel,
    app_version: &str,
) -> TelemetryRecord {
    let trace_id = new_event_id();
    TelemetryRecord {
        schema_version: "1.0.0".to_string(),
        event_name: event_name.to_string(),
        event_id: new_event_id(),
        timestamp: Utc::now().to_rfc3339(),
        level: level.as_str().to_string(),
        source: TelemetrySource {
            layer: TelemetrySourceLayer::Server.as_str().to_string(),
            app: "navix-server".to_string(),
            app_version: app_version.to_string(),
            env: current_env(),
        },
        actor: TelemetryActor {
            user_uuid: None,
            is_authenticated: false,
            role: None,
        },
        context: TelemetryContext {
            session_id: trace_id.clone(),
            trace_id,
            request_id: None,
            route: None,
            platform: Some("server".to_string()),
            device_id: None,
        },
        metrics: TelemetryMetrics { latency_ms: None },
        result: TelemetryResult {
            status: TelemetryResultStatus::Success.as_str().to_string(),
            error_code: None,
            error_message: None,
        },
        payload: None,
    }
}

fn redact_if_sensitive(key: &str, value: &Value) -> Value {
    let lowered = key.to_ascii_lowercase();
    if SENSITIVE_KEYS.iter().any(|s| *s == lowered) {
        Value::String("***".to_string())
    } else {
        value.clone()
    }
}

fn sanitize_record(record: &mut TelemetryRecord) {
    if let Some(payload) = record.payload.as_mut() {
        let sanitized = payload
            .iter()
            .map(|(k, v)| (k.clone(), redact_if_sensitive(k, v)))
            .collect();
        *payload = sanitized;
    }
}

pub fn emit_json_log(mut record: TelemetryRecord) {
    // 输出前统一做脱敏，避免调用方遗漏导致敏感信息泄露。
    sanitize_record(&mut record);
    match serde_json::to_string(&record) {
        Ok(line) => match record.level.as_str() {
            "DEBUG" => tracing::debug!("{line}"),
            "WARN" => tracing::warn!("{line}"),
            "ERROR" | "FATAL" => tracing::error!("{line}"),
            _ => tracing::info!("{line}"),
        },
        Err(err) => tracing::error!("failed to serialize telemetry record: {err}"),
    }
}
