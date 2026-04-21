import type { User } from "@/services/user";
import type { ApiResponse } from "@/types/sync";
import { callTauri } from "@/services/tauri";

export async function updateUsernameRecord(
  uuid: string,
  newUsername: string,
): Promise<void> {
  await callTauri("update_username_record", {
    payload: { uuid, new_username: newUsername },
  });
}

export async function setUserLoginStatusRecord(
  uuid: string,
  isLoggedIn: boolean,
): Promise<void> {
  await callTauri("set_user_login_status", {
    payload: { uuid, is_logged_in: isLoggedIn },
  });
}

export async function updateUserServerAddressRecord(
  uuid: string,
  serverAddress: string,
): Promise<void> {
  await callTauri("update_user_server_address", {
    payload: { uuid, server_address: serverAddress },
  });
}

export async function getAllUsersRecord(): Promise<User[]> {
  const response = await callTauri<ApiResponse<User[]>>("get_all_users_record");
  return response.data ?? [];
}

export async function getUsedIconNamesRecord(): Promise<string[]> {
  const response = await callTauri<ApiResponse<string[]>>(
    "get_used_icon_names_record",
  );
  return response.data ?? [];
}

export async function deleteUserWithDataRecord(
  userUuid: string,
): Promise<void> {
  await callTauri("delete_user_with_data_record", {
    payload: { user_uuid: userUuid },
  });
}

export async function saveUserRecord(user: User): Promise<void> {
  await callTauri("save_user_record", {
    payload: user,
  });
}
