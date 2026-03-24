import type {
  ApiResponse,
  ClientCompatibilityRequest,
  ClientInfoDto,
  ClientSyncDataChunk,
  ClientSyncPayload,
  CompatibilityInfo,
  ServerSyncData,
  StartSyncResponse,
} from "@/types/sync";
import type { User } from "@/services/user";
import { callTauri } from "@/services/tauri";
import { runWithActiveSessionRetry } from "@/services/authSession";

/**
 * 创建一条同步日志记录。
 * 该调用只写本地库，不依赖服务端鉴权。
 */
export async function createSyncLogRecord(
  sessionId: string,
  userUuid: string,
): Promise<void> {
  await callTauri("create_sync_log_record", {
    payload: { session_id: sessionId, user_uuid: userUuid },
  });
}

/**
 * 完成同步日志记录，写入最终状态、摘要或错误信息。
 */
export async function finalizeSyncLogRecord(
  sessionId: string,
  status: "success" | "failed",
  summary?: string,
  errorText?: string,
): Promise<void> {
  await callTauri("finalize_sync_log_record", {
    payload: {
      session_id: sessionId,
      status,
      summary: summary || null,
      error_text: errorText || null,
    },
  });
}

/**
 * 通过 Tauri 侧接口校验当前用户 token 与服务端账号状态。
 * 该入口会复用统一会话状态，并在鉴权失败时自动 refresh 后重试一次。
 */
export async function checkTokenAndUserRecord(
  user: User,
  clientInfo: Pick<ClientInfoDto, "app_version" | "username">,
): Promise<void> {
  await runWithActiveSessionRetry(
    (activeUser) =>
      callTauri("check_token_and_user", {
        client_info: {
          ...clientInfo,
          token: activeUser.token,
          server_address: activeUser.serverAddress,
        },
      }),
    { expectedUserUuid: user.uuid },
  );
}

/**
 * 请求服务端兼容性信息。
 * 该接口是公开接口，不需要 JWT，因此不接入 refresh 逻辑。
 */
export async function checkServerCompatibilityRecord(
  serverAddress: string,
  payload: ClientCompatibilityRequest,
): Promise<ApiResponse<CompatibilityInfo>> {
  return callTauri("check_server_compatibility", {
    server_address: serverAddress,
    payload,
  });
}

/**
 * 提交一个同步分块到服务端。
 * 若 access token 失效，会先刷新当前会话，再重试本次分块发送。
 */
export async function syncChunkRecord(
  user: User,
  payload: ClientSyncDataChunk,
): Promise<ApiResponse<void>> {
  return runWithActiveSessionRetry(
    (activeUser) => callTauri("sync_chunk", { user: activeUser, payload }),
    { expectedUserUuid: user.uuid },
  );
}

/**
 * 开启新的同步会话。
 * 该入口会使用当前活动会话中的最新 token，而不是信任调用方传入的旧 token。
 */
export async function syncStartRecord(
  user: User,
  payload: ClientSyncPayload,
): Promise<ApiResponse<StartSyncResponse>> {
  return runWithActiveSessionRetry(
    (activeUser) => callTauri("sync_start", { user: activeUser, payload }),
    { expectedUserUuid: user.uuid },
  );
}

/**
 * 收集本地待同步数据。
 * 该调用只访问桌面本地数据库，不依赖服务端鉴权。
 */
export async function collectLocalSyncDataRecord(userUuid: string): Promise<
  ApiResponse<{
    websiteGroups: Record<string, unknown>[];
    websites: Record<string, unknown>[];
    searchEngines: Record<string, unknown>[];
  }>
> {
  return callTauri("collect_local_sync_data", {
    payload: { user_uuid: userUuid },
  });
}

/**
 * 完成同步会话并获取服务端聚合结果。
 * 若 token 已失效，会在刷新后自动重试一次。
 */
export async function syncCompleteRecord(
  user: User,
  sessionId: string,
): Promise<ApiResponse<ServerSyncData>> {
  return runWithActiveSessionRetry(
    (activeUser) => callTauri("sync_complete", { user: activeUser, sessionId }),
    { expectedUserUuid: user.uuid },
  );
}

/**
 * 将服务端同步结果写回本地数据库。
 */
export async function applySyncResultRecord(
  userUuid: string,
  serverData: ServerSyncData,
): Promise<void> {
  await callTauri("apply_sync_result", {
    payload: {
      user_uuid: userUuid,
      server_data: serverData,
    },
  });
}

/**
 * 读取指定用户的本地增量同步游标。
 */
export async function getLastSyncRevisionRecord(
  userUuid: string,
): Promise<ApiResponse<{ lastSyncedRev: number }>> {
  return callTauri("get_last_sync_revision_record", {
    payload: { user_uuid: userUuid },
  });
}
