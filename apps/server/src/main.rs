use api::routes::create_router;
use axum_server::tls_rustls::RustlsConfig;
use clap::Parser;
use config::SERVER_DB_FILE_PATH;
use rustls::crypto::ring;
use shadow_rs::{formatcp, shadow};
use std::env;
use std::fs;
use std::net::{IpAddr, Ipv4Addr, SocketAddr, UdpSocket};
use std::path::Path;
use std::path::PathBuf;
use std::time::Duration;
use tokio::signal;
use tracing_subscriber::{fmt::time::ChronoLocal, layer::SubscriberExt, util::SubscriberInitExt};

pub mod api;
pub mod app_config;
pub mod config;
pub mod db;
pub mod error;
pub mod models;
pub mod observability;
pub mod services;
pub mod utils;

shadow!(build);

const VERSION_INFO: &str = formatcp!(
    r#"{}
commit_hash: {}
build_time: {}
build_env: {},{}"#,
    build::PKG_VERSION,
    build::SHORT_COMMIT,
    build::BUILD_TIME,
    build::RUST_VERSION,
    build::RUST_CHANNEL
);

#[derive(Parser, Debug)]
#[command(name = "Navix", version = VERSION_INFO)]
struct Args {
    #[arg(long, default_value = "9990", env = "HTTP_PORT")]
    http_port: u16,

    #[arg(long, default_value = "9991", env = "HTTPS_PORT")]
    https_port: u16,

    /// 启用 HTTPS（需同时提供 --cert-path 和 --key-path）
    #[arg(long = "enable-https", short = 's', requires_all = ["cert_path", "key_path"])]
    enable_https: bool,

    /// HTTPS 使用的证书链文件路径（PEM 格式）
    #[arg(short = 'c', long, env = "TLS_CERT_PATH")]
    cert_path: Option<PathBuf>,

    /// HTTPS 使用的私钥文件路径（PEM 格式）
    #[arg(short = 'k', long, env = "TLS_KEY_PATH")]
    key_path: Option<PathBuf>,

    /// 命令行标志 > 环境变量 > 默认值
    #[arg(
        long,
        env = "DATABASE_URL",
        default_value = SERVER_DB_FILE_PATH
    )]
    database_url: String, // 直接使用一个 String 来接收
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 仅在 debug 构建时固定工作目录到 server crate 根目录，避免从仓库根运行时相对路径漂移。
    // release（含 Docker 镜像）应保留运行环境工作目录，例如 /data。
    #[cfg(debug_assertions)]
    {
        let server_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        if env::current_dir()? != server_root {
            env::set_current_dir(&server_root)?;
        }
    }

    dotenvy::dotenv().ok();

    init_logging();

    // 安装默认的 Rustls 加密程序提供者。
    // 这是 `axum-server` 在启用 `tls-rustls` 特性时所要求的。
    ring::default_provider()
        .install_default()
        .expect("Failed to install Rustls default crypto provider");

    let args = Args::parse();
    tracing::debug!("Successfully parsed command-line arguments: {:?}", args);

    if let Some(db_path_str) = args.database_url.strip_prefix("sqlite:") {
        let db_path = Path::new(db_path_str);
        // 获取父目录
        if let Some(parent_dir) = db_path.parent() {
            // 如果父目录不是根目录且不存在，则创建它
            if !parent_dir.as_os_str().is_empty() && !parent_dir.exists() {
                tracing::info!(
                    "Database directory {:?} does not exist. Creating it...",
                    parent_dir
                );
                fs::create_dir_all(parent_dir)?;
            }
        }
    }

    // 建立数据库连接池。
    let pool = db::connection::establish_connection(&args.database_url).await?;
    let pool_for_shutdown = pool.clone();
    tracing::info!("Database connection pool established successfully.");

    let app = create_router(pool).await;

    let handle = axum_server::Handle::new();
    let shutdown_future = shutdown_signal(handle.clone());
    tokio::spawn(shutdown_future);

    let http_addr = SocketAddr::from(([0, 0, 0, 0], args.http_port));
    tracing::info!("🚀 Starting HTTP server at {}", http_addr);
    log_access_urls("http", args.http_port);

    let http_server = axum_server::bind(http_addr).handle(handle.clone()).serve(
        app.clone()
            .into_make_service_with_connect_info::<SocketAddr>(),
    );

    // --- 有条件地启动 HTTPS 服务器 ---
    if args.enable_https {
        let cert_path = args.cert_path.unwrap();
        let key_path = args.key_path.unwrap();

        tracing::info!(
            "TLS is enabled. Loading certificate from '{}' and key from '{}'",
            cert_path.display(),
            key_path.display()
        );

        // 加载 TLS 配置。
        let tls_config = RustlsConfig::from_pem_file(&cert_path, &key_path).await?;
        let https_addr = SocketAddr::from(([0, 0, 0, 0], args.https_port));

        tracing::info!("🚀 Starting HTTPS server at {}", https_addr);
        log_access_urls("https", args.https_port);
        let https_server = axum_server::bind_rustls(https_addr, tls_config)
            .handle(handle)
            .serve(app.into_make_service_with_connect_info::<SocketAddr>());

        // 等待任何一个服务器任务退出，如果任何任务返回错误，`try_join_all` 会立即返回。
        if let Err(e) = tokio::try_join!(http_server, https_server) {
            tracing::error!("A server task failed: {}", e);
            return Err(e.into());
        }
    } else {
        // 如果不启用 HTTPS，则只运行 HTTP 服务器
        if let Err(e) = http_server.await {
            tracing::error!("The HTTP server task failed: {}", e);
            return Err(e.into());
        }
    }

    // --- 执行最终的清理工作 ---
    tracing::info!("All servers shut down. Closing database connection pool...");
    pool_for_shutdown.close().await;
    tracing::info!("Database connection pool closed successfully. Exiting.");

    Ok(())
}

/// 打印本机可直接访问的地址，便于在日志中点击打开。
fn log_access_urls(scheme: &str, port: u16) {
    tracing::info!("Access URL: {}://127.0.0.1:{}", scheme, port);
    if let Some(lan_ip) = detect_lan_ipv4() {
        tracing::info!("Access URL: {}://{}:{}", scheme, lan_ip, port);
    }
}

/// 探测当前主网卡 IPv4 地址，用于打印局域网访问地址。
fn detect_lan_ipv4() -> Option<Ipv4Addr> {
    let candidates = [
        (Ipv4Addr::new(223, 5, 5, 5), 53),
        (Ipv4Addr::new(8, 8, 8, 8), 80),
    ];

    for (target_ip, target_port) in candidates {
        let socket = match UdpSocket::bind((Ipv4Addr::UNSPECIFIED, 0)) {
            Ok(s) => s,
            Err(_) => continue,
        };
        if socket.connect((target_ip, target_port)).is_err() {
            continue;
        }
        if let Ok(addr) = socket.local_addr()
            && let IpAddr::V4(ip) = addr.ip()
            && !ip.is_loopback()
        {
            return Some(ip);
        }
    }

    None
}

/// 为应用程序设置日志记录基础设施。
fn init_logging() {
    // 初始化日志
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                // axum logs rejections from built-in extractors with the `axum::rejection`
                // target, at `TRACE` level. `axum::rejection=trace` enables showing those events
                format!(
                    "{}=info,tower_http=info,axum::rejection=trace",
                    env!("CARGO_CRATE_NAME")
                )
                .into()
            }),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .with_timer(ChronoLocal::new("%Y-%m-%d %H:%M:%S%.3f".to_string())),
        )
        .init();
}

async fn shutdown_signal(handle: axum_server::Handle) {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Received termination signal shutting down");
    handle.graceful_shutdown(Some(Duration::from_secs(10))); // 10 secs is how long docker will wait
    // to force shutdown
}
