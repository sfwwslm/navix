import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { readDir } from "@tauri-apps/plugin-fs";
import { log } from "@/utils/logger";
import {
  createFrontendTelemetryLogger,
  LogLevel,
  ObservabilityEvent,
} from "@navix/shared-ts";
import {
  isPermissionGranted,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import {} from "@/constants";
import { getIconsDir } from "@/utils/fs";
import {
  CurrentUserPayload,
  ServerSyncData,
  SyncStatusUpdaters,
  ApiResponse,
  ClientSyncPayload,
  StartSyncResponse,
  DataType,
  ClientSyncDataChunk,
  ClientInfoDto,
  ClientCompatibilityRequest,
  CompatibilityInfo,
  APP_ERROR_CODES,
} from "@/types/sync";
import {
  ANONYMOUS_USER,
  ANONYMOUS_USER_UUID,
  User,
  deleteUserWithData,
  setUserLoginStatus,
  updateUsername,
} from "./user";
import { uploadIcons, downloadIcons } from "./iconSync";
import {
  applySyncResultRecord,
  checkServerCompatibilityRecord,
  checkTokenAndUserRecord,
  collectLocalSyncDataRecord,
  createSyncLogRecord,
  finalizeSyncLogRecord,
  getLastSyncRevisionRecord,
  syncChunkRecord,
  syncCompleteRecord,
  syncStartRecord,
} from "./database/commands/sync";

const DEFAULT_CHUNK_SIZE =
  Number(
    (import.meta as { env?: { VITE_SYNC_CHUNK_SIZE?: string } }).env
      ?.VITE_SYNC_CHUNK_SIZE ?? 100,
  ) || 100; // 支持环境变量覆盖，默认 100
const CLIENT_SYNC_PROTOCOL = 1;
const ACCOUNT_DELETED_CODE = APP_ERROR_CODES.AuthUserDeleted;
const ACCOUNT_NOT_FOUND_CODE = APP_ERROR_CODES.AuthUserNotFound;
const ACCOUNT_DISABLED_CODE = APP_ERROR_CODES.AuthUserDisabled;
const TOKEN_EXPIRED_CODE = APP_ERROR_CODES.AuthTokenExpired;
const CLIENT_VERSION_MISMATCH_CODE = APP_ERROR_CODES.SyncClientVersionMismatch;
const SYNC_PROTOCOL_MISMATCH_CODE = APP_ERROR_CODES.SyncProtocolMismatch;

/**
 * 判断服务端提示是否表示“账号已删除”。
 */
const isAccountDeletedMessage = (message: string | undefined) => {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("账号已被删除") ||
    lower.includes("account has been deleted") ||
    lower.includes("account deleted")
  );
};

/**
 * 判断服务端提示是否表示“用户不存在”。
 */
const isAccountNotFoundMessage = (message: string | undefined) => {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("用户不存在") ||
    lower.includes("account not found") ||
    lower.includes("user not found")
  );
};

/**
 * 判断服务端提示是否表示“令牌已过期”。
 */
const isTokenExpiredMessage = (message: string | undefined) => {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("过期的令牌") ||
    lower.includes("token expired") ||
    lower.includes("jwt expired") ||
    lower.includes("expired token")
  );
};

/**
 * 根据统一错误码判断账号删除/不存在场景。
 */
const isAccountDeletedResponse = (resp?: ApiResponse<unknown>) =>
  !!resp &&
  !resp.success &&
  // 账号态判断只看稳定 code，不依赖 message，避免多语言文案变更导致误判。
  // 优先按稳定错误码分支；message 仅用于展示。
  (resp.code === ACCOUNT_DELETED_CODE || resp.code === ACCOUNT_NOT_FOUND_CODE);

/**
 * 判断服务端提示是否表示“账号已禁用”。
 */
const isAccountDisabledMessage = (message: string | undefined) => {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("账号已被禁用") ||
    lower.includes("account has been disabled") ||
    lower.includes("account disabled")
  );
};

/**
 * 根据统一错误码判断账号禁用场景。
 */
const isAccountDisabledResponse = (resp?: ApiResponse<unknown>) =>
  // 统一错误码后不再依赖本地化文案匹配。
  !!resp && !resp.success && resp.code === ACCOUNT_DISABLED_CODE;

/**
 * 根据统一错误码判断令牌过期场景。
 */
const isTokenExpiredResponse = (resp?: ApiResponse<unknown>) =>
  // 令牌状态统一由后端 code 表达，客户端保持无语言耦合。
  !!resp && !resp.success && resp.code === TOKEN_EXPIRED_CODE;

const telemetry = createFrontendTelemetryLogger({
  app: "desktop",
  // app 启动时可再接入真实版本注入；当前保底保证日志结构稳定。
  appVersion: "unknown",
  sink: (record) => {
    const line = JSON.stringify(record);
    if (record.level === LogLevel.Error) {
      log.error(line);
      return;
    }
    if (record.level === LogLevel.Warn) {
      log.warn(line);
      return;
    }
    log.info(line);
  },
});

const emitSyncEvent = (
  event: ObservabilityEvent,
  payload: Record<string, unknown> = {},
  level: LogLevel = LogLevel.Info,
) => {
  // 埋点不阻塞主流程，统一异步发送。
  void telemetry.logEvent(event, level, payload);
};

/**
 * 统一格式化未知错误，便于在日志里保留原始调用信息。
 */
// 统一格式化错误日志，便于排查 invoke/网络层返回的原始信息
function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * 生成一个分块校验串。
 * 客户端与服务端都基于 JSON 字符串做比较，确保校验规则一致。
 */
function buildChunkChecksum(chunk: unknown): string {
  // 与服务端保持一致：对 JSON 字符串做稳定比较，不引入额外依赖。
  return JSON.stringify(chunk);
}

/**
 * 从未知错误对象中提取统一错误码。
 * 用于在同步流程里判断是否属于账号删除、禁用或 token 过期。
 */
function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === "string") {
      return code;
    }
  }
  return undefined;
}

/**
 * 解析 JWT 的 issuer 字段。
 * 该值用于确认本地账号绑定的服务器实例与当前服务端实例一致。
 */
function parseJwtIssuer(token: string | undefined): string | null {
  if (!token) {
    return null;
  }
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const parsed: unknown = JSON.parse(jsonPayload);
    if (
      parsed &&
      typeof parsed === "object" &&
      "iss" in parsed &&
      typeof parsed.iss === "string"
    ) {
      return parsed.iss;
    }
  } catch (error) {
    log.warn(`解析 token issuer 失败: ${String(error)}`);
  }
  return null;
}

/**
 * 校验当前账号绑定的服务器实例与 token issuer 及目标服务端实例一致。
 * 若三者任一不匹配，直接阻断同步，避免把数据发到错误的服务端实例。
 */
function ensureExpectedServerInstance(
  user: User,
  actualServerInstanceUuid: string,
): User {
  if (!user.serverInstanceUuid) {
    throw new Error("当前用户未绑定服务器实例 UUID，请重新登录");
  }

  const tokenIssuer = parseJwtIssuer(user.token);
  if (tokenIssuer && tokenIssuer !== user.serverInstanceUuid) {
    throw new Error(
      `本地账号绑定的服务器实例(${user.serverInstanceUuid})与当前令牌 issuer(${tokenIssuer})不一致`,
    );
  }

  if (tokenIssuer && tokenIssuer !== actualServerInstanceUuid) {
    throw new Error(
      `当前令牌 issuer(${tokenIssuer})与服务端返回实例(${actualServerInstanceUuid})不一致`,
    );
  }

  if (user.serverInstanceUuid !== actualServerInstanceUuid) {
    throw new Error(
      `当前账号绑定的服务器实例(${user.serverInstanceUuid})与目标服务端实例(${actualServerInstanceUuid})不一致`,
    );
  }

  return user;
}

/**
 * 尝试从未知错误对象中解析统一 API 响应结构。
 */
function tryParseApiResponse(err: unknown): ApiResponse<unknown> | undefined {
  if (!err) return undefined;
  if (typeof err === "object" && "success" in err && "code" in err) {
    return err as ApiResponse<unknown>;
  }
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!raw) return undefined;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  const jsonText = raw.slice(start, end + 1);
  try {
    const parsed: unknown = JSON.parse(jsonText);
    if (
      parsed &&
      typeof parsed === "object" &&
      "success" in parsed &&
      "code" in parsed
    ) {
      return parsed as ApiResponse<unknown>;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * 在本地创建一条同步日志记录。
 */
async function createSyncLog(
  sessionId: string,
  userUuid: string,
): Promise<void> {
  try {
    await createSyncLogRecord(sessionId, userUuid);
  } catch (error) {
    log.warn(`写入同步日志失败（create）：${formatError(error)}`);
  }
}

/**
 * 更新同步日志的最终状态、摘要和错误信息。
 */
async function finalizeSyncLog(
  sessionId: string,
  status: "success" | "failed",
  summary?: string,
  errorText?: string,
): Promise<void> {
  try {
    await finalizeSyncLogRecord(sessionId, status, summary, errorText);
  } catch (error) {
    log.warn(`写入同步日志失败（finalize）：${formatError(error)}`);
  }
}

/**
 * @function runSyncPrerequisites
 * @brief 执行同步前的准备和验证工作，包括验证用户 Token 和设置用户重命名监听器。
 * @description 这是同步流程的第一个关键步骤，未来可在此添加服务端兼容性检查等逻辑。
 * @param {User} user - 当前登录的用户对象。
 * @param {SyncStatusUpdaters} updaters - 用于更新 UI 状态和 Auth Context 的回调函数集合。
 * @returns {Promise<void>}
 */
const runSyncPrerequisites = async (
  user: User,
  {
    setSyncMessage,
    switchActiveUser,
    refreshAvailableUsers,
    t,
  }: SyncStatusUpdaters,
): Promise<void> => {
  setSyncMessage(t("sync.verifyingUser"));

  const appWebview = getCurrentWebviewWindow();
  let unlisten: (() => void) | undefined;

  try {
    // 监听后端发来的用户重命名事件
    unlisten = await appWebview.listen<CurrentUserPayload>(
      "user-rename",
      (event) => {
        void (async () => {
          const newUsername = event.payload.username;
          // 更新数据库
          await updateUsername(user.uuid, newUsername);
          // 更新 AuthContext 状态
          const updatedUser = { ...user, username: newUsername };
          switchActiveUser(updatedUser);
          await refreshAvailableUsers();

          if (await isPermissionGranted()) {
            sendNotification({
              title: t("account.dataSync"),
              body: t("sync.serverUserUpdated"),
              icon: "logo.svg",
              largeIcon: "logo.svg",
              autoCancel: true,
            });
          }
          log.info("本地用户名和状态已同步更新。");
        })();
      },
    );

    // 验证用户 Token
    const clientInfoDto: ClientInfoDto = {
      app_version: await getVersion(),
      username: user.username,
      token: user.token || "",
      server_address: user.serverAddress || "",
    };

    /// 校验 Token 和 用户名是否发送变更
    await checkTokenAndUserRecord(user, {
      app_version: clientInfoDto.app_version,
      username: clientInfoDto.username,
    });

    // 校验服务端兼容性（协议/最低客户端版本）
    setSyncMessage(t("sync.verifyingServer"));
    if (!user.serverAddress) {
      throw new Error("服务器地址未配置，无法校验兼容性");
    }
    const compatPayload: ClientCompatibilityRequest = {
      app_version: clientInfoDto.app_version,
      sync_protocol: CLIENT_SYNC_PROTOCOL,
    };
    emitSyncEvent(ObservabilityEvent.SyncCompatCheckStarted, {
      serverAddress: user.serverAddress,
      appVersion: compatPayload.app_version,
      syncProtocol: compatPayload.sync_protocol,
      userUuid: user.uuid,
    });
    const compatResp: ApiResponse<CompatibilityInfo> =
      await checkServerCompatibilityRecord(user.serverAddress, compatPayload);
    if (!compatResp.success || !compatResp.data) {
      emitSyncEvent(
        ObservabilityEvent.SyncCompatCheckBlocked,
        {
          serverAddress: user.serverAddress,
          code: compatResp.code,
          message: compatResp.message,
        },
        LogLevel.Warn,
      );
      if (
        compatResp.code === CLIENT_VERSION_MISMATCH_CODE ||
        compatResp.code === SYNC_PROTOCOL_MISMATCH_CODE
      ) {
        throw new Error(
          `客户端与服务端不兼容：${compatResp.message} (code=${compatResp.code})`,
        );
      }
      throw new Error(`兼容性检查失败: ${compatResp.message}`);
    }

    emitSyncEvent(ObservabilityEvent.SyncCompatCheckPassed, {
      serverAddress: user.serverAddress,
      serverVersion: compatResp.data.server_version,
      minClientVersion: compatResp.data.min_client_version,
      syncProtocolCurrent: compatResp.data.sync_protocol_current,
      syncProtocolMinClient: compatResp.data.sync_protocol_min_client,
    });
  } finally {
    // 清理监听器
    if (unlisten) {
      unlisten();
    }
  }
};

/**
 * 处理服务端判定账号已删除后的本地清理与状态切换。
 */
const handleAccountDeletedOnServer = async (
  user: User,
  updaters: SyncStatusUpdaters,
  serverMessage?: string,
) => {
  const {
    setSyncMessage,
    switchActiveUser,
    refreshAvailableUsers,
    incrementDataVersion,
    t,
  } = updaters;

  setSyncMessage(
    t("sync.accountDeletedOnServer", { reason: serverMessage || "" }),
  );

  try {
    await deleteUserWithData(user.uuid);
    const users = await refreshAvailableUsers();
    const anonymous = users.find((u) => u.uuid === ANONYMOUS_USER_UUID) || {
      uuid: ANONYMOUS_USER_UUID,
      username: ANONYMOUS_USER,
      isLoggedIn: 1,
    };

    switchActiveUser(anonymous);
    incrementDataVersion();
    setSyncMessage(t("sync.accountDeletedCleanupDone"));
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log.error(`服务器删除账号，本地清理失败: ${errMsg}`);
    setSyncMessage(t("sync.accountDeletedCleanupFailed", { error: errMsg }));
  }
};

/**
 * 处理服务端判定账号已禁用后的本地登出与状态切换。
 */
const handleAccountDisabledOnServer = async (
  user: User,
  updaters: SyncStatusUpdaters,
  serverMessage?: string,
) => {
  const { setSyncMessage, switchActiveUser, refreshAvailableUsers, t } =
    updaters;

  setSyncMessage(
    t("sync.accountDisabledOnServer", { reason: serverMessage || "" }),
  );

  try {
    await setUserLoginStatus(user.uuid, false);
    const users = await refreshAvailableUsers();
    const anonymous = users.find((u) => u.uuid === ANONYMOUS_USER_UUID) || {
      uuid: ANONYMOUS_USER_UUID,
      username: ANONYMOUS_USER,
      isLoggedIn: 1,
    };
    switchActiveUser(anonymous);
    setSyncMessage(t("sync.accountDisabledSignedOut"));
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log.error(`服务器禁用账号，本地登出失败: ${errMsg}`);
    setSyncMessage(t("sync.accountDisabledSignoutFailed", { error: errMsg }));
  }
};

/**
 * 处理服务端判定令牌过期后的本地登出与状态切换。
 */
const handleTokenExpiredOnServer = async (
  user: User,
  updaters: SyncStatusUpdaters,
  serverMessage?: string,
) => {
  const { setSyncMessage, switchActiveUser, refreshAvailableUsers, t } =
    updaters;

  setSyncMessage(
    t("sync.tokenExpiredOnServer", { reason: serverMessage || "" }),
  );

  try {
    await setUserLoginStatus(user.uuid, false);
    const users = await refreshAvailableUsers();
    const anonymous = users.find((u) => u.uuid === ANONYMOUS_USER_UUID) || {
      uuid: ANONYMOUS_USER_UUID,
      username: ANONYMOUS_USER,
      isLoggedIn: 1,
    };
    switchActiveUser(anonymous);
    setSyncMessage(t("sync.tokenExpiredSignedOut"));
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log.error(`令牌过期，本地登出失败: ${errMsg}`);
    setSyncMessage(t("sync.tokenExpiredSignoutFailed", { error: errMsg }));
  }
};
/**
 * @function sendDataInChunks
 * @description 将指定类型的数据分块发送到服务器。
 * 每个分块发送都会复用统一会话状态；若 token 失效，会由下层先 refresh 再重试。
 * @param sessionId - 当前同步会话的 ID。
 * @param dataType - 要发送的数据类型。
 * @param data - 包含所有待发送记录的数组。
 * @param setSyncMessage - 用于更新 UI 状态的函数。
 * @param t - i18next 翻译函数。
 */
async function sendDataInChunks<T>(
  user: User, // 添加 user 参数
  sessionId: string,
  dataType: DataType,
  data: T[],
  setSyncMessage: (message: string) => void,
  t: (key: string, options?: Record<string, unknown>) => string,
  chunkSize: number,
) {
  if (data.length === 0) {
    log.info(`[同步] 无需同步数据: ${dataType}`);
    return;
  }
  const totalChunks = Math.ceil(data.length / chunkSize);
  for (let i = 0; i < totalChunks; i++) {
    const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
    setSyncMessage(
      t("sync.sendingChunk", {
        type: t(`sync.dataType.${dataType}`),
        current: i + 1,
        total: totalChunks,
      }),
    );
    const chunkPayload: ClientSyncDataChunk = {
      session_id: sessionId,
      data_type: dataType,
      chunk_index: i,
      total_chunks: totalChunks,
      chunk_checksum: buildChunkChecksum(chunk),
      chunk_data: chunk as unknown as Record<string, unknown>[],
    };
    // 简单重试，避免网络波动导致同步中断
    let attempt = 0;
    const maxRetries = 3;
    while (true) {
      try {
        const resp: ApiResponse<void> = await syncChunkRecord(
          user,
          chunkPayload,
        );
        if (!resp.success) {
          throw new Error(
            `分块提交失败: ${resp.code || "UNKNOWN"} ${resp.message || ""}`.trim(),
          );
        }
        break;
      } catch (err) {
        attempt += 1;
        const backoff = 300 * attempt;
        log.warn(
          `发送分块失败，正在重试(${attempt}/${maxRetries})，等待 ${backoff}ms: ${String(err)}`,
        );
        if (attempt >= maxRetries) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }
}

/**
 * @function startSync
 * @brief 启动完整的双向数据同步流程。
 * @param user 已登录的用户对象。
 * @param updaters 用于更新UI同步状态的回调函数集合。
 * @description 同步过程中的所有服务端鉴权请求都通过统一会话层发送，token 失效时会自动 refresh。
 */
export const startSync = async (user: User, updaters: SyncStatusUpdaters) => {
  const {
    setIsSyncing,
    setSyncMessage,
    setSyncCompleted,
    incrementDataVersion,
    t,
  } = updaters;
  setIsSyncing(true);
  setSyncCompleted(false);
  emitSyncEvent(ObservabilityEvent.SyncSessionStarted, {
    userUuid: user.uuid,
    serverAddress: user.serverAddress || "",
  });

  let currentSessionId: string | undefined;
  let syncUser = user;

  try {
    // 动态分块大小，兼容服务器建议和本地默认
    let chunkSize = DEFAULT_CHUNK_SIZE;

    // 1. 验证用户和版本
    await runSyncPrerequisites(user, updaters);

    // 2. 收集本地数据和图标
    setSyncMessage(t("sync.collectingLocalData"));
    let localIcons: string[] = [];
    try {
      const iconsDir = await getIconsDir();
      const entries = await readDir(iconsDir);
      localIcons = entries.map((entry) => entry.name).filter(Boolean);
    } catch (e) {
      log.warn(`扫描本地图标目录失败: ${String(e)}。`);
    }

    // 3. 开始同步会话
    setSyncMessage(t("sync.startingSession"));
    const startPayload: ClientSyncPayload = {
      user_uuid: user.uuid,
      // 使用服务器分配的 rev 做增量游标，避免依赖客户端时钟
      last_synced_rev: await getLastSyncRevision(user.uuid),
    };
    const startResponse: ApiResponse<StartSyncResponse> = await syncStartRecord(
      syncUser,
      startPayload,
    );
    if (!startResponse.success || !startResponse.data) {
      if (isTokenExpiredResponse(startResponse)) {
        await handleTokenExpiredOnServer(user, updaters, startResponse.message);
        return;
      }
      if (isAccountDisabledResponse(startResponse)) {
        await handleAccountDisabledOnServer(
          user,
          updaters,
          startResponse.message,
        );
        return;
      }
      if (isAccountDeletedResponse(startResponse)) {
        await handleAccountDeletedOnServer(
          user,
          updaters,
          startResponse.message,
        );
        return;
      }
      throw new Error(`开启同步会话失败: ${startResponse.message}`);
    }
    syncUser = ensureExpectedServerInstance(
      syncUser,
      startResponse.data.server_instance_uuid,
    );
    const sessionId = startResponse.data.session_id;
    currentSessionId = sessionId;
    await createSyncLog(sessionId, user.uuid);
    if (
      startResponse.data.suggested_chunk_size &&
      startResponse.data.suggested_chunk_size > 0
    ) {
      chunkSize = startResponse.data.suggested_chunk_size;
      log.info(`采用服务器建议的分块大小: ${chunkSize}`);
    }

    // 4. 分块发送各类数据
    const localSyncDataResponse = await collectLocalSyncDataRecord(user.uuid);
    const localSyncData = localSyncDataResponse.data;

    if (!localSyncData) {
      throw new Error("收集本地同步数据失败");
    }

    const dataToSend = [
      { type: DataType.WebsiteGroups, data: localSyncData.websiteGroups },
      { type: DataType.Websites, data: localSyncData.websites },
      { type: DataType.SearchEngines, data: localSyncData.searchEngines },
    ];

    for (const { type, data } of dataToSend) {
      await sendDataInChunks(
        syncUser,
        sessionId,
        type,
        data,
        setSyncMessage,
        t,
        chunkSize,
      );
    }

    // 单独处理并发送 localIcons
    await sendDataInChunks(
      syncUser,
      sessionId,
      DataType.LocalIcons,
      localIcons,
      setSyncMessage,
      t,
      chunkSize,
    );

    // 5. 完成同步会话并处理服务器返回的数据
    setSyncMessage(t("sync.completingSync"));
    let completeResponse: ApiResponse<ServerSyncData>;
    try {
      completeResponse = await syncCompleteRecord(syncUser, sessionId);
    } catch (err) {
      // 记录原始错误，便于排查 server/解析问题
      const errText = formatError(err);
      log.error(`sync_complete 调用失败: ${errText}`);
      throw err;
    }

    if (!completeResponse.success || !completeResponse.data) {
      if (isTokenExpiredResponse(completeResponse)) {
        await handleTokenExpiredOnServer(
          user,
          updaters,
          completeResponse.message,
        );
        return;
      }
      if (isAccountDisabledResponse(completeResponse)) {
        await handleAccountDisabledOnServer(
          user,
          updaters,
          completeResponse.message,
        );
        return;
      }
      if (isAccountDeletedResponse(completeResponse)) {
        await handleAccountDeletedOnServer(
          user,
          updaters,
          completeResponse.message,
        );
        return;
      }
      throw new Error(`完成同步失败: ${completeResponse.message}`);
    }

    const serverData = completeResponse.data;

    if (serverData.sync_data) {
      setSyncMessage(t("sync.updatingLocalDb"));
    }
    await applySyncResultRecord(user.uuid, serverData);

    if (serverData.icons_to_upload?.length > 0) {
      setSyncMessage(
        t("sync.uploadingIcons", { num: serverData.icons_to_upload.length }),
      );
      await uploadIcons(serverData.icons_to_upload);
    }
    if (serverData.icons_to_download?.length > 0) {
      setSyncMessage(
        t("sync.downloadingIcons", {
          num: serverData.icons_to_download.length,
        }),
      );
      await downloadIcons(serverData.icons_to_download);
    }

    incrementDataVersion();
    const summaryText = `同步完成：分组${serverData.website_groups_count}，网站${serverData.websites_count}，搜索引擎${serverData.search_engines_count}，已上传图标${serverData.icons_to_upload.length}，已下载图标${serverData.icons_to_download.length}`;
    // UI 仅展示简洁提示，详细信息写入日志
    setSyncMessage(t("sync.syncSuccess"));
    if (currentSessionId) {
      await finalizeSyncLog(currentSessionId, "success", summaryText);
    }
  } catch (error: unknown) {
    const apiResponse = tryParseApiResponse(error);
    const errorMessage =
      apiResponse?.message ||
      (error instanceof Error ? error.message : String(error));
    emitSyncEvent(
      ObservabilityEvent.SyncSessionFailed,
      {
        userUuid: user.uuid,
        serverAddress: user.serverAddress || "",
        error: errorMessage,
        code: apiResponse?.code || "",
      },
      LogLevel.Error,
    );
    const isAccountDeleted =
      isAccountDeletedMessage(errorMessage) ||
      isAccountNotFoundMessage(errorMessage) ||
      getErrorCode(error) === ACCOUNT_DELETED_CODE ||
      getErrorCode(error) === ACCOUNT_NOT_FOUND_CODE;
    const isAccountDisabled =
      isAccountDisabledMessage(errorMessage) ||
      getErrorCode(error) === ACCOUNT_DISABLED_CODE;
    const isTokenExpired =
      isTokenExpiredMessage(errorMessage) ||
      isTokenExpiredResponse(apiResponse) ||
      getErrorCode(error) === TOKEN_EXPIRED_CODE;

    if (isAccountDeleted) {
      await handleAccountDeletedOnServer(user, updaters, errorMessage);
      if (currentSessionId) {
        await finalizeSyncLog(
          currentSessionId,
          "failed",
          undefined,
          errorMessage,
        );
      }
      return;
    }
    if (isAccountDisabled) {
      await handleAccountDisabledOnServer(user, updaters, errorMessage);
      if (currentSessionId) {
        await finalizeSyncLog(
          currentSessionId,
          "failed",
          undefined,
          errorMessage,
        );
      }
      return;
    }
    if (isTokenExpired) {
      await handleTokenExpiredOnServer(user, updaters, errorMessage);
      if (currentSessionId) {
        await finalizeSyncLog(
          currentSessionId,
          "failed",
          undefined,
          errorMessage,
        );
      }
      return;
    }

    setSyncMessage(t("sync.syncFailed", { error: errorMessage }));
    if (currentSessionId) {
      await finalizeSyncLog(
        currentSessionId,
        "failed",
        undefined,
        errorMessage,
      );
    }
  } finally {
    setSyncCompleted(true);
  }
};

/**
 * @function getLastSyncTimestamp
 * @description 从数据库中获取指定用户的上一次同步时间戳。
 * @param {string} userUuid - 用户的 UUID。
 * @returns {Promise<string | null>} 如果找到了时间戳，则返回其字符串形式，否则返回 null。
 */
export async function getLastSyncRevision(userUuid: string): Promise<number> {
  try {
    const response = await getLastSyncRevisionRecord(userUuid);
    if (typeof response.data?.lastSyncedRev === "number") {
      return response.data.lastSyncedRev;
    }
    log.info(`用户 ${userUuid} 尚未有同步 rev 记录，默认返回 0。`);
    return 0;
  } catch (error) {
    log.error(`查询 last_synced_rev 失败: ${String(error)}`);
    return 0;
  }
}
