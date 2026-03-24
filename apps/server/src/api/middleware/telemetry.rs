use crate::observability::{build_server_record_raw, emit_json_log};
use axum::{
    body::{Body, to_bytes},
    extract::Request,
    http::HeaderValue,
    middleware::Next,
    response::Response,
};
use serde_json::Value;
use shared_rs::dto::telemetry::{LogLevel, TelemetryResultStatus};
use std::collections::BTreeMap;
use std::time::Instant;
use uuid::Uuid;

pub const TRACE_ID_HEADER: &str = "x-trace-id";
pub const REQUEST_ID_HEADER: &str = "x-request-id";

#[derive(Clone, Debug)]
pub struct RequestTelemetryContext {
    pub trace_id: String,
    pub request_id: String,
}

pub fn get_trace_id(request: &Request) -> Option<&str> {
    request
        .extensions()
        .get::<RequestTelemetryContext>()
        .map(|ctx| ctx.trace_id.as_str())
}

fn parse_header_value(request: &Request, key: &str) -> Option<String> {
    request
        .headers()
        .get(key)
        .and_then(|v| v.to_str().ok())
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .map(ToOwned::to_owned)
}

fn new_id() -> String {
    Uuid::new_v4().as_simple().to_string()
}

pub async fn request_telemetry_layer(mut request: Request, next: Next) -> Response {
    let started_at = Instant::now();
    let method = request.method().to_string();
    let path = request.uri().path().to_string();

    let trace_id = parse_header_value(&request, TRACE_ID_HEADER).unwrap_or_else(new_id);
    let request_id = parse_header_value(&request, REQUEST_ID_HEADER).unwrap_or_else(new_id);

    request.extensions_mut().insert(RequestTelemetryContext {
        trace_id: trace_id.clone(),
        request_id: request_id.clone(),
    });

    let mut response = next.run(request).await;
    inject_trace_id_into_api_json(&mut response, &trace_id).await;
    let status = response.status();
    let latency_ms = started_at.elapsed().as_millis() as u64;

    if let Ok(value) = HeaderValue::from_str(&trace_id) {
        response.headers_mut().insert(TRACE_ID_HEADER, value);
    }
    if let Ok(value) = HeaderValue::from_str(&request_id) {
        response.headers_mut().insert(REQUEST_ID_HEADER, value);
    }

    let level = match status.as_u16() {
        500..=599 => LogLevel::Error,
        400..=499 => LogLevel::Warn,
        _ => LogLevel::Info,
    };
    let mut record =
        build_server_record_raw("api.request.completed", level, env!("CARGO_PKG_VERSION"));
    record.context.trace_id = trace_id;
    record.context.session_id = request_id.clone();
    record.context.request_id = Some(request_id.clone());
    record.context.route = Some(format!("{method} {path}"));
    record.metrics.latency_ms = Some(latency_ms);
    record.result.status = match status.as_u16() {
        500..=599 => TelemetryResultStatus::Fail.as_str().to_string(),
        400..=499 => TelemetryResultStatus::Fail.as_str().to_string(),
        _ => TelemetryResultStatus::Success.as_str().to_string(),
    };
    record.result.error_code =
        (status.as_u16() >= 400).then(|| format!("HTTP.{}", status.as_u16()));
    record.result.error_message = (status.as_u16() >= 400)
        .then(|| format!("request finished with status {}", status.as_u16()));
    record.payload = Some(crate::observability::string_payload(BTreeMap::from([
        ("method".to_string(), method),
        ("path".to_string(), path),
        ("request_id".to_string(), request_id),
        (
            "operation".to_string(),
            "request_telemetry_layer".to_string(),
        ),
        ("module".to_string(), "http.middleware".to_string()),
    ])));
    emit_json_log(record);

    response
}

async fn inject_trace_id_into_api_json(response: &mut Response, trace_id: &str) {
    let is_json = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .map(|ct| ct.starts_with("application/json"))
        .unwrap_or(false);
    if !is_json {
        return;
    }

    let (parts, body) = std::mem::replace(response, Response::new(Body::empty())).into_parts();
    let bytes = match to_bytes(body, 2 * 1024 * 1024).await {
        Ok(bytes) => bytes,
        Err(_) => {
            *response = Response::from_parts(parts, Body::empty());
            return;
        }
    };

    let mut value: Value = match serde_json::from_slice(&bytes) {
        Ok(v) => v,
        Err(_) => {
            *response = Response::from_parts(parts, Body::from(bytes));
            return;
        }
    };

    if let Some(obj) = value.as_object_mut()
        && obj.contains_key("trace_id")
    {
        let should_fill = obj
            .get("trace_id")
            .map(|v| v.is_null() || v.as_str().is_some_and(|s| s.is_empty()))
            .unwrap_or(false);
        if should_fill {
            obj.insert("trace_id".to_string(), Value::String(trace_id.to_string()));
        }

        if let Some(error) = obj.get_mut("error").and_then(Value::as_object_mut) {
            let should_fill_error = error
                .get("trace_id")
                .map(|v| v.is_null() || v.as_str().is_some_and(|s| s.is_empty()))
                .unwrap_or(true);
            if should_fill_error {
                error.insert("trace_id".to_string(), Value::String(trace_id.to_string()));
            }
        }
    }

    let next_bytes = match serde_json::to_vec(&value) {
        Ok(v) => v,
        Err(_) => bytes.to_vec(),
    };
    *response = Response::from_parts(parts, Body::from(next_bytes));
}
