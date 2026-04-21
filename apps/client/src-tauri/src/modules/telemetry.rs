use shared_rs::dto::telemetry::{
    LogLevel, TelemetryActor, TelemetryContext, TelemetryMetrics, TelemetryRecord, TelemetryResult,
    TelemetryResultStatus, TelemetrySource, TelemetrySourceLayer,
};
use std::collections::BTreeMap;
use std::sync::{Mutex, OnceLock};
use tauri_plugin_http::reqwest::Response;
use uuid::Uuid;

const SENSITIVE_KEYS: [&str; 5] = [
    "token",
    "refresh_token",
    "password",
    "authorization",
    "cookie",
];

static TRACE_CONTEXT: OnceLock<Mutex<String>> = OnceLock::new();
static SESSION_CONTEXT: OnceLock<Mutex<String>> = OnceLock::new();

fn trace_context() -> &'static Mutex<String> {
    TRACE_CONTEXT.get_or_init(|| Mutex::new(String::new()))
}

fn session_context() -> &'static Mutex<String> {
    SESSION_CONTEXT.get_or_init(|| Mutex::new(String::new()))
}

fn redact_if_sensitive(key: &str, value: &str) -> serde_json::Value {
    let lowered = key.to_ascii_lowercase();
    if SENSITIVE_KEYS.iter().any(|s| *s == lowered) {
        serde_json::Value::String("***".to_string())
    } else {
        serde_json::Value::String(value.to_string())
    }
}

fn sanitize_payload(payload: BTreeMap<String, String>) -> BTreeMap<String, serde_json::Value> {
    payload
        .into_iter()
        .map(|(k, v)| {
            let masked = redact_if_sensitive(&k, &v);
            (k, masked)
        })
        .collect()
}

pub fn new_id() -> String {
    Uuid::new_v4().as_simple().to_string()
}

pub fn set_trace_id(trace_id: impl Into<String>) {
    if let Ok(mut guard) = trace_context().lock() {
        *guard = trace_id.into();
    }
}

pub fn ensure_trace_id() -> String {
    if let Ok(mut guard) = trace_context().lock() {
        if guard.is_empty() {
            *guard = new_id();
        }
        return guard.clone();
    }
    new_id()
}

pub fn ensure_session_id() -> String {
    if let Ok(mut guard) = session_context().lock() {
        if guard.is_empty() {
            *guard = new_id();
        }
        return guard.clone();
    }
    new_id()
}

pub fn capture_trace_id_from_response(response: &Response) {
    let Some(value) = response.headers().get("x-trace-id") else {
        return;
    };
    let Ok(trace_id) = value.to_str() else {
        return;
    };
    let trimmed = trace_id.trim();
    if !trimmed.is_empty() {
        set_trace_id(trimmed.to_string());
    }
}

pub fn emit_event(
    event: &str,
    level: LogLevel,
    trace_id: &str,
    attrs: BTreeMap<String, String>,
    operation: &str,
) {
    let mut payload = sanitize_payload(attrs);
    payload.insert(
        "operation".to_string(),
        serde_json::Value::String(operation.to_string()),
    );

    let has_failure = matches!(level, LogLevel::Error | LogLevel::Fatal | LogLevel::Warn);
    let record = TelemetryRecord {
        schema_version: "1.0.0".to_string(),
        event_name: event.to_string(),
        event_id: new_id(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        level: level.as_str().to_string(),
        source: TelemetrySource {
            layer: TelemetrySourceLayer::Client.as_str().to_string(),
            app: "navix-client".to_string(),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            env: std::env::var("NAVIX_ENV")
                .or_else(|_| std::env::var("APP_ENV"))
                .unwrap_or_else(|_| "local".to_string()),
        },
        actor: TelemetryActor {
            user_uuid: None,
            is_authenticated: false,
            role: None,
        },
        context: TelemetryContext {
            session_id: ensure_session_id(),
            trace_id: trace_id.to_string(),
            request_id: None,
            route: None,
            platform: Some("client".to_string()),
            device_id: None,
        },
        metrics: TelemetryMetrics { latency_ms: None },
        result: TelemetryResult {
            status: if has_failure {
                TelemetryResultStatus::Fail.as_str().to_string()
            } else {
                TelemetryResultStatus::Success.as_str().to_string()
            },
            error_code: payload
                .get("code")
                .and_then(|value| value.as_str())
                .map(str::to_string),
            error_message: payload
                .get("message")
                .and_then(|value| value.as_str())
                .map(str::to_string),
        },
        payload: Some(payload),
    };

    match serde_json::to_string(&record) {
        Ok(line) => match level {
            LogLevel::Error | LogLevel::Fatal => log::error!("{line}"),
            LogLevel::Warn => log::warn!("{line}"),
            LogLevel::Debug => log::debug!("{line}"),
            _ => log::info!("{line}"),
        },
        Err(err) => log::error!("failed to serialize client telemetry record: {err}"),
    }
}
