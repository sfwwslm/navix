# Navix 服务端

## 概述

Navix 服务端位于 `apps/server`，基于 Rust、Axum、SQLx 和 SQLite 实现。

服务端负责管理员初始化、账号管理、同步接口、图标文件传输、管理员操作、结构化日志，以及网页端静态资源分发。

## 主要职责

### 认证与账号

- 管理员初始化
- 管理员创建用户
- 用户登录
- 刷新令牌
- 登录状态校验
- 用户名修改
- 密码修改

### 同步与文件

- 提供兼容性检查接口
- 提供会话化同步接口
- 提供图标上传与下载能力
- 维护服务端实例标识，用于客户端绑定与同步校验

### 管理能力

- 查询用户列表
- 启用用户
- 禁用用户
- 清理用户数据
- 删除用户

### 运行时能力

- 输出结构化日志
- 注入 `trace_id` 与 `request_id`
- 分发内嵌的网页端静态资源

## 接口分组

### 公共接口

- `GET /api/bootstrap/status`
- `POST /api/bootstrap/init`
- `POST /api/login`
- `POST /api/refresh`
- `GET /api/version`
- `POST /api/compat`

### 登录后接口

- `GET /api/v1/auth/status`
- `GET /api/v1/launchpad`
- `GET /api/v1/welcome`
- `PUT /api/v1/user/username`
- `PUT /api/v1/user/password`
- `POST /api/v1/sync/start`
- `POST /api/v1/sync/chunk`
- `POST /api/v1/sync/complete`
- `POST /api/v1/icons/upload`
- `GET /api/v1/icons/download/{user_uuid}/{file_name}`

### 管理员接口

- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users`
- `POST /api/v1/admin/users/{uuid}/disable`
- `POST /api/v1/admin/users/{uuid}/enable`
- `POST /api/v1/admin/users/{uuid}/cleanup`
- `DELETE /api/v1/admin/users/{uuid}`

## 用户与初始化流程

1. 部署并启动服务端。
2. 访问网页端登录页，调用 `GET /api/bootstrap/status` 检查是否已初始化。
3. 若未初始化，提交 `POST /api/bootstrap/init` 创建首个管理员账号。
4. 初始化完成后，公开入口只提供登录，不提供注册。
5. 后续用户由管理员通过管理员接口创建。

说明：

- 管理员初始化仅用于首个管理员账号创建。
- 普通用户不能自行注册。

## 运行方式

在仓库根目录执行：

```bash
pnpm --dir apps/web web:build
cargo run -p navix-server
```

也可以使用根脚本：

```bash
pnpm server:dev
```

## 数据与文件目录

### Debug 构建

- 数据根目录：`apps/server/.navix-dev`
- 数据库：`apps/server/.navix-dev/database/navix-server.db`
- 实例标识文件：`apps/server/.navix-dev/server_instance.uuid`
- 图标目录：`apps/server/.navix-dev/storage/user_icons`

### Release 构建

- 数据库：`database/navix-server.db`
- 实例标识文件：`server_instance.uuid`
- 图标目录：`storage/user_icons`

`server_instance.uuid` 用于标识当前服务端实例，应与数据库和存储数据一起维护。

## 配置方式

服务端支持通过命令行参数或环境变量配置，优先级为：

`命令行参数 > 环境变量 > 默认值`

常用配置项：

- `DATABASE_URL`
- `JWT_SECRET`
- `HTTP_PORT`
- `HTTPS_PORT`
- `TLS_CERT_PATH`
- `TLS_KEY_PATH`
- `RUST_LOG`

示例：

```bash
cargo run -p navix-server -- --enable-https --cert-path /path/to/fullchain.pem --key-path /path/to/privkey.pem
```

环境变量模板见 `apps/server/.example.env`。

## 开发校验

仅修改服务端 Rust 代码时，执行：

```bash
cargo fmt
cargo clippy
```

涉及认证、同步或数据库行为时，建议额外执行：

```bash
cargo test --workspace
```
