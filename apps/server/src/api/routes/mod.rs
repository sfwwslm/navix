mod index;

pub mod jwt;

use crate::api::middleware::telemetry::{
    REQUEST_ID_HEADER, TRACE_ID_HEADER, request_telemetry_layer,
};
use crate::config::{SERVER_UUID_FILE_PATH, get_or_create_server_uuid};
use crate::services::static_handler::fallback_handler;
use crate::services::sync_session_service::SessionManager as SyncSessionManager;

use axum::extract::connect_info::ConnectInfo;
use axum::{
    Router,
    extract::DefaultBodyLimit,
    http::{HeaderName, Method, Request},
    middleware,
};

use crate::db::DbPool;
use std::env;
use std::net::SocketAddr;
use std::path::Path;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::limit::RequestBodyLimitLayer;
use tower_http::trace::{DefaultOnRequest, DefaultOnResponse, TraceLayer};
use tracing::{Level, info, info_span, warn};
use uuid::Uuid;

/// 定义一个应用状态，用于在所有请求处理器中共享数据
#[derive(Clone)]
pub struct AppState {
    pub(crate) server_instance_uuid: Uuid,
    pub sync_session_manager: SyncSessionManager,
    pub pool: DbPool,
}

///
/// 打印关于 `server_instance.uuid` 文件重要性的安全提示。
///
/// 此函数使用 `tracing::warn!` 输出一个标准化的警告框，提醒用户此文件的
/// 关键性、位置以及妥善保管的必要性。
///
/// # Arguments
///
/// * `server_uuid` - 当前服务器实例的UUID，它将被包含在提示信息中。
///
pub fn show_uuid_security_notice(server_uuid: Uuid) {
    let border = "===================================================================";
    let title = "▓▓ 重要安全提示 (IMPORTANT SECURITY NOTICE) ▓▓";

    let relative = Path::new(SERVER_UUID_FILE_PATH);
    // 获取当前工作目录
    let absolute_path = if relative.is_absolute() {
        relative.to_path_buf()
    } else {
        env::current_dir().unwrap().join(relative)
    };
    let display_path = absolute_path.display().to_string();

    warn!("");
    warn!("{}", border);
    warn!("{}", title);
    warn!("{}", border);
    warn!("");
    warn!("  服务器实例ID文件已定位/创建于:");
    warn!("  {}", display_path);
    warn!("");
    warn!("  此文件是服务器的唯一身份凭证，与数据库同等重要。");
    warn!("  请务必妥善保管和备份此文件，切勿随意删除！");
    warn!("  删除此文件将导致服务器生成新的身份，并可能造成客户端数据同步失败。");
    warn!("{}", border);
    warn!("");

    info!("Server instance is running with UUID: {}", server_uuid);
}

/// 创建路由
pub async fn create_router(db_pool: DbPool) -> Router {
    // 在应用启动时获取服务器实例的 UUID
    let server_uuid = get_or_create_server_uuid().await;
    show_uuid_security_notice(server_uuid);

    // 创建共享的应用状态
    let app_state = Arc::new(AppState {
        server_instance_uuid: server_uuid,
        sync_session_manager: SyncSessionManager::new(),
        pool: db_pool,
    });

    // 配置 CORS：允许所有来源、常用方法
    let cors = CorsLayer::new()
        .allow_origin(Any) // 你也可以用 .allow_origin("https://example.com".parse().unwrap())
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers(Any)
        .expose_headers([
            HeaderName::from_static(TRACE_ID_HEADER),
            HeaderName::from_static(REQUEST_ID_HEADER),
        ]);

    let protected_routes = Router::new()
        .nest("/api/v1", index::protected_api_v1_protected())
        .route_layer(middleware::from_fn_with_state(
            Arc::clone(&app_state),
            jwt::user_auth_layer,
        ))
        .with_state(Arc::clone(&app_state));

    let admin_protected_routes = Router::new()
        .nest("/api/v1", index::protected_admin_api_v1())
        .route_layer(middleware::from_fn_with_state(
            Arc::clone(&app_state),
            jwt::user_auth_layer,
        ))
        .with_state(Arc::clone(&app_state));

    // 创建一个需要状态的路由实例，并立即为其提供状态
    let state_routes = index::state_api_router().with_state(Arc::clone(&app_state));

    Router::new()
        .nest(
            "/api",
            index::public_api_router().with_state(Arc::clone(&app_state)),
        )
        .nest("/api", state_routes)
        .merge(protected_routes)
        .merge(admin_protected_routes)
        .layer(middleware::from_fn(request_telemetry_layer))
        .layer(cors)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(|request: &Request<_>| {
                    let forwarded_ip = request
                        .headers()
                        .get("x-forwarded-for")
                        .and_then(|v| v.to_str().ok())
                        .map(|s| s.split(',').next().unwrap_or("").trim().to_string());
                    let connect_ip = request
                        .extensions()
                        .get::<ConnectInfo<SocketAddr>>()
                        .map(|ConnectInfo(addr)| addr.to_string());
                    let client_ip = forwarded_ip
                        .or(connect_ip)
                        .unwrap_or_else(|| "unknown".to_string());

                    info_span!(
                        env!("CARGO_CRATE_NAME"),
                        client_ip,
                        method = ?request.method(),
                        path = ?request.uri().path(),
                        some_other_field = tracing::field::Empty,
                    )
                })
                .on_request(DefaultOnRequest::new().level(Level::INFO))
                .on_response(DefaultOnResponse::new().level(Level::INFO)),
        )
        .layer(DefaultBodyLimit::disable())
        .layer(RequestBodyLimitLayer::new(
            100 * 1024 * 1024, /* 100MB */
        ))
        .fallback(fallback_handler)
}
