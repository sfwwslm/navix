use std::path::Path;
use tokio::fs;
use uuid::Uuid;

// 在调试模式下将生成的文件集中到一个目录，便于清理和忽略。
#[cfg(debug_assertions)]
pub const DEV_DATA_DIR: &str = ".navix-dev";

// 服务器实例 UUID 文件路径
#[cfg(debug_assertions)]
pub const SERVER_UUID_FILE_PATH: &str = ".navix-dev/server_instance.uuid";
#[cfg(not(debug_assertions))]
pub const SERVER_UUID_FILE_PATH: &str = "server_instance.uuid";

// 数据库文件路径
#[cfg(debug_assertions)]
pub const SERVER_DB_FILE_PATH: &str = "sqlite:.navix-dev/database/navix-server.db";
#[cfg(not(debug_assertions))]
pub const SERVER_DB_FILE_PATH: &str = "sqlite:database/navix-server.db";

/// 存储用户图标的目录
#[cfg(debug_assertions)]
pub const STORAGE_BASE_DIR: &str = ".navix-dev/storage/user_icons";
#[cfg(not(debug_assertions))]
pub const STORAGE_BASE_DIR: &str = "storage/user_icons";

///
/// 获取或创建服务器实例的唯一ID。
///
/// 此函数会检查 `SERVER_UUID_FILE_PATH` 文件：
/// 1. 如果文件存在，则读取其中的 UUID。
/// 2. 如果文件不存在，则生成一个新的 v4 UUID，写入文件，然后返回新的 UUID。
/// 3. 如果目录不存在，会自动创建。
///
/// # Panics
///
/// 如果无法创建目录、创建文件或读写文件（例如，由于权限问题），程序将会 panic，
/// 因为这是一个关键的启动步骤。
///
/// # Returns
///
/// 返回一个 `Uuid` 作为服务器的唯一标识。
///
pub async fn get_or_create_server_uuid() -> Uuid {
    const UUID_FILE_PATH: &str = SERVER_UUID_FILE_PATH;
    let path = Path::new(UUID_FILE_PATH);

    // 检查文件是否存在
    if path.exists() {
        // 文件存在，直接读取内容
        let uuid_str = fs::read_to_string(path)
            .await
            .expect("Failed to read server UUID file");

        Uuid::parse_str(uuid_str.trim()).expect("Invalid UUID format in server_instance.uuid file")
    } else {
        // 文件不存在，生成新的 UUID 并保存
        let new_uuid = Uuid::new_v4();

        if let Some(parent_dir) = path.parent() {
            fs::create_dir_all(parent_dir)
                .await
                .expect("Failed to create data directory");
        }

        // 将新的 UUID 写入文件
        fs::write(path, new_uuid.to_string())
            .await
            .expect("Failed to write server UUID to file");

        tracing::info!("New server instance UUID generated: {new_uuid}");
        new_uuid
    }
}
