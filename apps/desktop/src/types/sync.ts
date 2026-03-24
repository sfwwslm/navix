import type { User } from "@/services/user";

export type {
  ApiResponse,
  VersionInfo,
  WebsiteGroupDto,
  WebsitesDto,
  SearchEngineDto,
  SyncDataDto,
  ServerSyncData,
  ClientSyncPayload,
  StartSyncResponse,
  ClientSyncDataChunk,
  ClientInfoDto,
  CurrentUserPayload,
  ClientCompatibilityRequest,
  CompatibilityInfo,
} from "@navix/shared-ts";

export { DataType, dataTypeSchema } from "@navix/shared-ts";
export { APP_ERROR_CODES } from "@navix/shared-ts";

export interface SyncStatusUpdaters {
  setIsSyncing: (isSyncing: boolean) => void;
  setSyncMessage: (message: string) => void;
  setSyncCompleted: (completed: boolean) => void;
  incrementDataVersion: () => void;
  switchActiveUser: (user: User) => void;
  refreshAvailableUsers: () => Promise<User[]>;
  t: (key: string, options?: Record<string, unknown>) => string;
}
