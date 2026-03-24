/**
 * @interface WebsiteItem
 * @description 代表一个独立的网站链接项。
 */
export interface WebsiteItem {
  /**
   * 数据库自增 ID。
   */
  id: number;
  /**
   * 全局唯一标识符 (Universally Unique Identifier)。
   */
  uuid: string;
  /**
   * 用户的 UUID。
   */
  user_uuid: string;
  /**
   * 该网站项所属分组的 UUID。
   */
  group_uuid: string;
  /**
   * 网站的显示名称。
   */
  title: string;
  /**
   * 网站的完整URL。
   */
  url: string;
  /**
   * 网站的内网URL (可选)。
   */
  url_lan?: string;
  /**
   * 备用图标的名称。
   */
  default_icon: string;
  /**
   * 自动抓取的本地图标文件路径 (可选)。
   */
  local_icon_path?: string | null;
  /**
   * 图标来源 (可选), e.g., 'user_uploaded', 'auto_fetched'
   */
  icon_source?: string;
  /**
   * 网站的简短描述 (可选)。
   */
  description?: string;
  /**
   * 自定义背景色 (可选)。
   */
  background_color?: string;
  /**
   * 排序值。
   */
  sort_order?: number;
  /**
   * 软删除标志 (0: 未删除, 1: 已删除)。
   */
  is_deleted: number;
  /**
   * 创建时间戳。
   */
  created_at?: string;
  /**
   * 最后更新时间戳。
   */
  updated_at?: string;
}

/**
 * @interface WebsiteGroup
 * @description 代表一个网站分组。
 */
export interface WebsiteGroup {
  /**
   * 数据库自增 ID。
   */
  id: number;
  /**
   * 全局唯一标识符 (Universally Unique Identifier)。
   */
  uuid: string;
  /**
   * 用户的 UUID。
   */
  user_uuid: string;
  /**
   * 分组名称。
   */
  name: string;
  /**
   * 分组的简短描述 (可选)。
   */
  description?: string;
  /**
   * 排序值。
   */
  sort_order?: number;
  /**
   * 软删除标志 (0: 未删除, 1: 已删除)。
   */
  is_deleted: number;
  /**
   * 创建时间戳。
   */
  created_at?: string;
  /**
   * 最后更新时间戳。
   */
  updated_at?: string;
}

/**
 * @interface SearchEngine
 * @description 代表一个搜索引擎。
 */
export interface SearchEngine {
  /**
   * 数据库自增 ID 或内置标识符。
   */
  id: number | string;
  /**
   * 全局唯一标识符 (Universally Unique Identifier)。
   */
  uuid: string;
  /**
   * 用户的 UUID (自定义引擎专属)。
   */
  user_uuid?: string;
  /**
   * 搜索引擎名称。
   */
  name: string;
  /**
   * 搜索 URL 模板，使用 %s 作为查询占位符。
   */
  url_template: string;
  /**
   * 默认图标 Iconify。
   */
  default_icon: React.ComponentType<unknown> | string;
  /**
   * 本地图标路径 (可选)。
   */
  local_icon_path?: string | null;
  /**
   * 是否为内置引擎 (不可删除/编辑)。
   */
  is_deletable: number;
}
