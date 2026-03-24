import {
  WebsiteGroup,
  WebsiteItem,
  SearchEngine,
} from "@/features/Launchpad/types";
import { defaultWebsiteData } from "@/features/Launchpad/constants/launchpadItems";
import type { ApiResponse } from "@/types/sync";
import { callTauri } from "@/services/tauri";

export async function ensureDefaultLaunchpadData(userUuid: string) {
  await callTauri("ensure_default_launchpad_data", {
    payload: {
      user_uuid: userUuid,
      groups: defaultWebsiteData,
    },
  });
}

export async function getLaunchpadDataRecord(
  userUuid: string,
): Promise<ApiResponse<{ groups: WebsiteGroup[]; items: WebsiteItem[] }>> {
  return callTauri<
    ApiResponse<{ groups: WebsiteGroup[]; items: WebsiteItem[] }>
  >("get_launchpad_data_record", { payload: { user_uuid: userUuid } });
}

export async function saveWebsiteGroup(
  group: Partial<WebsiteGroup>,
): Promise<void> {
  await callTauri("save_website_group", { payload: group });
}

export async function updateWebsiteGroupsOrder(
  groups: Pick<WebsiteGroup, "uuid">[],
): Promise<void> {
  await callTauri("update_website_groups_order", {
    payload: { uuids: groups.map((group) => group.uuid) },
  });
}

export async function deleteWebsiteGroup(groupUuid: string): Promise<void> {
  await callTauri("delete_website_group", {
    payload: { group_uuid: groupUuid },
  });
}

export async function saveWebsiteItem(
  item: Partial<WebsiteItem>,
): Promise<void> {
  await callTauri("save_website_item", { payload: item });
}

export async function updateWebsiteItemsOrder(
  items: Pick<WebsiteItem, "uuid">[],
): Promise<void> {
  await callTauri("update_website_items_order", {
    payload: { uuids: items.map((item) => item.uuid) },
  });
}

export async function deleteWebsiteItem(itemUuid: string): Promise<void> {
  await callTauri("delete_website_item", { payload: { item_uuid: itemUuid } });
}

export async function getSearchEnginesRecord(
  userUuid: string,
): Promise<ApiResponse<SearchEngine[]>> {
  return callTauri<ApiResponse<SearchEngine[]>>("get_search_engines_record", {
    payload: { user_uuid: userUuid },
  });
}

export async function getDefaultSearchEngineRecord(
  userUuid: string,
): Promise<ApiResponse<SearchEngine | null>> {
  return callTauri<ApiResponse<SearchEngine | null>>(
    "get_default_search_engine_record",
    { payload: { user_uuid: userUuid } },
  );
}

export async function saveSearchEngineRecord(
  engine: Partial<Omit<SearchEngine, "id" | "is_deletable">> & {
    user_uuid: string;
  },
): Promise<void> {
  await callTauri("save_search_engine_record", { payload: engine });
}

export async function setActiveSearchEngineRecord(
  engineUuid: string,
  userUuid: string,
): Promise<void> {
  await callTauri("set_active_search_engine_record", {
    payload: { engine_uuid: engineUuid, user_uuid: userUuid },
  });
}

export async function clearDefaultSearchEngineRecord(
  userUuid: string,
): Promise<void> {
  await callTauri("clear_default_search_engine_record", {
    payload: { user_uuid: userUuid },
  });
}

export async function deleteSearchEngineRecord(uuid: string): Promise<void> {
  await callTauri("delete_search_engine_record", { payload: { uuid } });
}
