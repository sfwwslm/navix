import {
  APP_ERROR_CODES,
  AppErrorCategory,
  type AppErrorCode,
  type AppErrorPayload,
} from "./generated/contracts";

export type AppErrorSource =
  | "server"
  | "http"
  | "network"
  | "timeout"
  | "tauri"
  | "app";

export interface AppExceptionOptions {
  code: AppErrorCode;
  message: string;
  category: AppErrorCategory;
  retryable: boolean;
  source: AppErrorSource;
  httpStatus?: number | null;
  details?: Record<string, unknown> | null;
  traceId?: string | null;
  cause?: unknown;
}

export interface NormalizeAppExceptionOptions {
  source: AppErrorSource;
  code?: AppErrorCode;
  message?: string;
  category?: AppErrorCategory;
  retryable?: boolean;
  httpStatus?: number | null;
  details?: Record<string, unknown> | null;
  traceId?: string | null;
}

const AUTH_ERROR_CODES = new Set<AppErrorCode>([
  APP_ERROR_CODES.AuthTokenInvalid,
  APP_ERROR_CODES.AuthTokenExpired,
  APP_ERROR_CODES.AuthUserNotFound,
  APP_ERROR_CODES.AuthUserDeleted,
  APP_ERROR_CODES.AuthUserDisabled,
]);

function extractJsonObject(input: string): string | null {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return null;
  }
  return input.slice(start, end + 1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function isAppErrorCode(value: unknown): value is AppErrorCode {
  return (
    typeof value === "string" &&
    Object.values(APP_ERROR_CODES).includes(value as AppErrorCode)
  );
}

export function categoryFromErrorCode(code: AppErrorCode): AppErrorCategory {
  switch (code) {
    case APP_ERROR_CODES.AuthWrongCredentials:
    case APP_ERROR_CODES.AuthUserNotFound:
    case APP_ERROR_CODES.AuthUserDisabled:
    case APP_ERROR_CODES.AuthUserDeleted:
    case APP_ERROR_CODES.AuthMissingCredentials:
    case APP_ERROR_CODES.AuthTokenInvalid:
    case APP_ERROR_CODES.AuthTokenExpired:
    case APP_ERROR_CODES.AuthTokenCreationFailed:
      return AppErrorCategory.Auth;
    case APP_ERROR_CODES.UserUsernameExists:
    case APP_ERROR_CODES.UserWrongOldPassword:
    case APP_ERROR_CODES.UserInvalidPassword:
      return AppErrorCategory.User;
    case APP_ERROR_CODES.SyncClientVersionMismatch:
    case APP_ERROR_CODES.SyncProtocolMismatch:
    case APP_ERROR_CODES.SyncSessionInvalid:
      return AppErrorCategory.Sync;
    case APP_ERROR_CODES.ResourceForbidden:
      return AppErrorCategory.Permission;
    case APP_ERROR_CODES.ResourceNotFound:
      return AppErrorCategory.NotFound;
    case APP_ERROR_CODES.RequestValidationFailed:
      return AppErrorCategory.Validation;
    case APP_ERROR_CODES.RequestBadRequest:
      return AppErrorCategory.Request;
    case APP_ERROR_CODES.NetworkRequestFailed:
      return AppErrorCategory.Network;
    case APP_ERROR_CODES.RequestTimeout:
      return AppErrorCategory.Timeout;
    case APP_ERROR_CODES.TauriInvokeFailed:
    case APP_ERROR_CODES.ClientUnexpectedError:
      return AppErrorCategory.Client;
    case APP_ERROR_CODES.InternalServerError:
    case APP_ERROR_CODES.InternalDbError:
    case APP_ERROR_CODES.InternalIoError:
      return AppErrorCategory.Internal;
  }
}

export function isRetryableErrorCode(code: AppErrorCode): boolean {
  return (
    code === APP_ERROR_CODES.InternalServerError ||
    code === APP_ERROR_CODES.InternalDbError ||
    code === APP_ERROR_CODES.InternalIoError ||
    code === APP_ERROR_CODES.NetworkRequestFailed ||
    code === APP_ERROR_CODES.RequestTimeout
  );
}

function toDetails(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function extractPayloadFromResponse(
  value: unknown,
): Partial<AppErrorPayload> | null {
  if (!isRecord(value)) {
    return null;
  }

  if (isRecord(value.error)) {
    return value.error as Partial<AppErrorPayload>;
  }

  const code = isAppErrorCode(value.code) ? value.code : undefined;
  const message = typeof value.message === "string" ? value.message : undefined;
  const http_status =
    typeof value.http_status === "number"
      ? value.http_status
      : typeof value.httpStatus === "number"
        ? value.httpStatus
        : undefined;
  const details = toDetails(value.details);
  const trace_id =
    typeof value.trace_id === "string"
      ? value.trace_id
      : typeof value.traceId === "string"
        ? value.traceId
        : undefined;

  if (!code && !message && !http_status && !details && !trace_id) {
    return null;
  }

  return {
    code,
    message,
    category: code ? categoryFromErrorCode(code) : undefined,
    retryable: code ? isRetryableErrorCode(code) : undefined,
    http_status,
    details: details as Record<string, string[]> | null,
    trace_id,
  };
}

function extractPayloadFromUnknown(
  error: unknown,
): Partial<AppErrorPayload> | null {
  if (isRecord(error)) {
    return extractPayloadFromResponse(error);
  }

  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : null;
  if (!raw) {
    return null;
  }

  const json = extractJsonObject(raw);
  if (!json) {
    return null;
  }

  try {
    return extractPayloadFromResponse(JSON.parse(json));
  } catch {
    return null;
  }
}

export class AppException extends Error {
  public readonly code: AppErrorCode;
  public readonly category: AppErrorCategory;
  public readonly retryable: boolean;
  public readonly source: AppErrorSource;
  public readonly httpStatus: number | null;
  public readonly details: Record<string, unknown> | null;
  public readonly traceId: string | null;
  public readonly cause?: unknown;

  constructor(message: string, options: AppExceptionOptions) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = "AppException";
    this.code = options.code;
    this.category = options.category;
    this.retryable = options.retryable;
    this.source = options.source;
    this.httpStatus = options.httpStatus ?? null;
    this.details = options.details ?? null;
    this.traceId = options.traceId ?? null;
    this.cause = options.cause;
  }
}

export function createAppException(
  options: NormalizeAppExceptionOptions & { cause?: unknown },
): AppException {
  const code = options.code ?? APP_ERROR_CODES.ClientUnexpectedError;
  return new AppException(options.message ?? "发生未知错误", {
    message: options.message ?? "发生未知错误",
    code,
    category: options.category ?? categoryFromErrorCode(code),
    retryable: options.retryable ?? isRetryableErrorCode(code),
    source: options.source,
    httpStatus: options.httpStatus ?? null,
    details: options.details ?? null,
    traceId: options.traceId ?? null,
    cause: options.cause,
  });
}

export function normalizeAppException(
  error: unknown,
  fallback: NormalizeAppExceptionOptions,
): AppException {
  if (error instanceof AppException) {
    return error;
  }

  const payload = extractPayloadFromUnknown(error);
  const code =
    payload?.code ?? fallback.code ?? APP_ERROR_CODES.ClientUnexpectedError;
  const message =
    payload?.message ||
    fallback.message ||
    (error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "发生未知错误");

  return new AppException(message, {
    message,
    code,
    category:
      payload?.category ?? fallback.category ?? categoryFromErrorCode(code),
    retryable:
      payload?.retryable ?? fallback.retryable ?? isRetryableErrorCode(code),
    source: fallback.source,
    httpStatus: payload?.http_status ?? fallback.httpStatus ?? null,
    details: toDetails(payload?.details) ?? fallback.details ?? null,
    traceId: payload?.trace_id ?? fallback.traceId ?? null,
    cause: error,
  });
}

export function appExceptionFromResponse(
  response: unknown,
  source: AppErrorSource = "server",
  fallback: Omit<NormalizeAppExceptionOptions, "source"> = {},
): AppException {
  return normalizeAppException(response, { source, ...fallback });
}

export function isAppException(error: unknown): error is AppException {
  return error instanceof AppException;
}

export function isAuthAppError(error: unknown): error is AppException {
  return isAppException(error) && AUTH_ERROR_CODES.has(error.code);
}
