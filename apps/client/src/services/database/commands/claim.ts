import { callTauri } from "@/services/tauri";

export async function reassignAnonymousDataToUserRecord(
  userUuid: string,
): Promise<void> {
  await callTauri("reassign_anonymous_data_to_user", {
    payload: { real_user_uuid: userUuid },
  });
}
