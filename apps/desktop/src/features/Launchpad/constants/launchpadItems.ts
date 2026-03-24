/**
 * @interface DefaultWebsiteItem
 * @description 代表一个独立的网站链接项。内置默认数据专用类型
 */
export interface DefaultWebsiteItem {
  /**
   * 网站的显示名称。
   */
  title: string;
  /**
   * 网站的完整URL。
   */
  url: string;
  /**
   * 备用图标的名称。
   */
  default_icon: string;
  /**
   * 网站的简短描述 (可选)。
   */
  description?: string;
  /**
   * 排序值。
   */
  sort_order?: number;
}

/**
 * @interface DefaultWebsiteGroup
 * @description 代表一个网站分组。。内置默认数据专用类型
 */
export interface DefaultWebsiteGroup {
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
   * 该分组下包含的所有网站项。不是表中的字段！
   */
  items: DefaultWebsiteItem[];
}

// 在实际创建默认数据时，launchpadDb.ts 中的 `insertDefaultData` 会生成全新的、真实的 UUID。
export const defaultWebsiteData: DefaultWebsiteGroup[] = [
  {
    name: "APP",
    sort_order: 1,
    description: "默认分组",
    items: [
      {
        title: "必应",
        url: "https://cn.bing.com/",
        default_icon: "hugeicons:bing",
        sort_order: 1,
        description: "默认网站项",
      },
    ],
  },
];
