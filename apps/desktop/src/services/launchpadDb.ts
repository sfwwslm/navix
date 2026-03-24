import { log } from "@/utils/logger";
import { ANONYMOUS_USER_UUID } from "./user";
import {
  clearDefaultSearchEngineRecord,
  deleteSearchEngineRecord,
  deleteWebsiteGroup,
  deleteWebsiteItem,
  ensureDefaultLaunchpadData,
  getDefaultSearchEngineRecord,
  getLaunchpadDataRecord,
  getSearchEnginesRecord,
  saveSearchEngineRecord,
  saveWebsiteGroup,
  saveWebsiteItem,
  setActiveSearchEngineRecord,
  updateWebsiteGroupsOrder,
  updateWebsiteItemsOrder,
} from "./database/commands/launchpad";
import {
  SearchEngine,
  WebsiteGroup,
  WebsiteItem,
} from "@/features/Launchpad/types";

let initializationAttempted = false;

async function ensureDefaultDataIsInitialized(): Promise<void> {
  if (initializationAttempted) return;
  initializationAttempted = true;

  try {
    await ensureDefaultLaunchpadData(ANONYMOUS_USER_UUID);
  } catch (error) {
    initializationAttempted = false;
    log.error(`初始化默认导航数据失败: ${String(error)}`);
    throw error;
  }
}

export async function getLaunchpadData(
  userUuid: string,
): Promise<{ groups: WebsiteGroup[]; items: WebsiteItem[] }> {
  if (userUuid === ANONYMOUS_USER_UUID) {
    await ensureDefaultDataIsInitialized();
  }

  const response = await getLaunchpadDataRecord(userUuid);
  const groups = response.data?.groups ?? [];

  if (groups.length === 0) {
    log.warn(`通过用户uuid ${userUuid} 未找到分组数据。`);
    return { groups: [], items: [] };
  }
  return { groups, items: response.data?.items ?? [] };
}

export async function saveGroup(group: Partial<WebsiteGroup>): Promise<void> {
  if (!group.uuid && !group.user_uuid) {
    throw new Error("新增分组时必须提供 user_uuid！");
  }
  await saveWebsiteGroup(group);
}

export async function updateGroupsOrder(
  groups: Pick<WebsiteGroup, "uuid">[],
): Promise<void> {
  await updateWebsiteGroupsOrder(groups);
}

export async function deleteGroup(groupUuid: string): Promise<void> {
  await deleteWebsiteGroup(groupUuid);
}

export async function saveItem(item: Partial<WebsiteItem>): Promise<void> {
  if (!item.uuid && !item.user_uuid) {
    const message = "新增网站项时必须提供 user_uuid！";
    log.error(message);
    throw new Error(message);
  }
  await saveWebsiteItem(item);
}

export async function updateItemsOrder(
  items: Pick<WebsiteItem, "uuid">[],
): Promise<void> {
  await updateWebsiteItemsOrder(items);
}

export async function deleteItem(itemUuid: string): Promise<void> {
  await deleteWebsiteItem(itemUuid);
}

export async function getSearchEngines(
  userUuid: string,
): Promise<SearchEngine[]> {
  const response = await getSearchEnginesRecord(userUuid);
  return response.data ?? [];
}

export async function getDefaultSearchEngine(
  userUuid: string,
): Promise<SearchEngine | null> {
  const response = await getDefaultSearchEngineRecord(userUuid);
  return response.data ?? null;
}

export async function saveSearchEngine(
  engine: Partial<Omit<SearchEngine, "id" | "is_deletable">> & {
    user_uuid: string;
  },
): Promise<void> {
  await saveSearchEngineRecord(engine);
}

export async function setActiveSearchEngine(
  engineUuid: string,
  userUuid: string,
): Promise<void> {
  await setActiveSearchEngineRecord(engineUuid, userUuid);
}

export async function clearDefaultSearchEngine(
  userUuid: string,
): Promise<void> {
  await clearDefaultSearchEngineRecord(userUuid);
}

export async function deleteSearchEngine(uuid: string): Promise<void> {
  await deleteSearchEngineRecord(uuid);
}
