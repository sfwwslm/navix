# Telemetry 事件字典模板

新增或调整事件时，可先按以下模板整理语义、字段和使用范围，再落到具体实现中。

## 基本信息

- `event_name`：
- `display_name`：
- `owner`：
- `status`：`draft | active | deprecated`
- `layer`：`web | client | server | shared`

## 事件语义

- 触发时机：
- 业务含义：
- 使用场景：
- 是否关键路径：`yes | no`

## 字段定义

### 核心字段

| 字段 | 类型 | 是否必填 | 说明 |
| --- | --- | --- | --- |
| `event_name` | string | 是 | 统一事件名 |
| `timestamp` | string | 是 | UTC ISO 8601 |
| `level` | string | 是 | `DEBUG/INFO/WARN/ERROR/FATAL` |
| `context.trace_id` | string | 是 | 链路追踪 ID |
| `context.session_id` | string | 是 | 会话标识 |
| `result.status` | string | 是 | 结果状态 |

### 扩展字段

| 字段 | 类型 | 是否必填 | 示例 | 说明 |
| --- | --- | --- | --- | --- |
| `context.request_id` | string | 否 | `req_9f2c` | 请求标识 |
| `metrics.latency_ms` | number | 否 | `82` | 请求或操作耗时 |
| `result.error_code` | string | 否 | `SYNC_TIMEOUT` | 稳定错误码 |
| `payload.*` | mixed | 否 |  | 业务补充上下文 |

## 隐私检查

- 是否包含用户输入：`yes | no`
- 是否涉及敏感字段：`yes | no`
- 脱敏策略：

## 示例

```json
{
  "event_name": "auth.login.succeeded",
  "timestamp": "2026-03-20T10:15:00.000Z",
  "level": "INFO",
  "context": {
    "trace_id": "3f6f2f2ccf2e43a5a2f6c2e2f66a91c4",
    "session_id": "s_abc",
    "request_id": "req_9f2c"
  },
  "result": {
    "status": "success"
  },
  "payload": {}
}
```
