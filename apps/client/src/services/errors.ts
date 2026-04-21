import {
  AppException,
  type AppErrorSource,
  normalizeAppException,
} from "@navix/shared-ts";

export type { AppErrorSource };
export { AppException as AppError, AppException as ApiError };

export interface AppErrorOptions {
  code?: Parameters<typeof normalizeAppException>[1]["code"];
  source: AppErrorSource;
  details?: Record<string, unknown>;
  httpStatus?: number;
  traceId?: string | null;
  message?: string;
}

export function normalizeToAppError(
  error: unknown,
  fallback: AppErrorOptions,
): AppException {
  return normalizeAppException(error, {
    source: fallback.source,
    code: fallback.code,
    message: fallback.message,
    details: fallback.details,
    httpStatus: fallback.httpStatus,
    traceId: fallback.traceId,
  });
}
