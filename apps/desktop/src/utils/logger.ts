import * as tauriLog from "@tauri-apps/plugin-log";

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export const log = {
  debug(message: string): void {
    void tauriLog.debug(message);
  },
  info(message: string): void {
    void tauriLog.info(message);
  },
  warn(message: string): void {
    void tauriLog.warn(message);
  },
  error(message: string): void {
    void tauriLog.error(message);
  },
};
