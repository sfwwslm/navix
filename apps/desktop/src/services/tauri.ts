import { APP_ERROR_CODES } from "@navix/shared-ts";
import { invoke } from "@tauri-apps/api/core";
import { normalizeToAppError } from "./errors";

export async function callTauri<T = void>(
  command: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  try {
    return await invoke<T>(command, payload ?? {});
  } catch (error) {
    throw normalizeToAppError(error, {
      code: APP_ERROR_CODES.TauriInvokeFailed,
      source: "tauri",
      details: {
        command,
        payloadKeys: Object.keys(payload ?? {}),
      },
    });
  }
}
