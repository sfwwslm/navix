/**
 * 服务端版本信息。
 */
export interface VersionInfo {
  version: string;
  commit_hash: string;
  build_time?: string;
  build_env?: string;
}
