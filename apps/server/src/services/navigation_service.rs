use crate::db::DbPool;
use crate::models::website::{NavigationGroup, NavigationWebsite, WebsiteGroupDto, WebsitesDto};
use std::cmp::Ordering;
use std::collections::HashMap;

/// 获取指定用户的导航数据，只返回未删除的分组和网站。
pub async fn fetch_navigation_for_user(
    pool: &DbPool,
    user_uuid: &str,
) -> Result<Vec<NavigationGroup>, sqlx::Error> {
    let groups = sqlx::query_as::<_, WebsiteGroupDto>(
        r#"
        SELECT uuid, name, description, sort_order, is_deleted, rev, updated_at
        FROM website_groups
        WHERE user_uuid = ?1 AND is_deleted = 0
        ORDER BY sort_order IS NULL, sort_order ASC, updated_at DESC
        "#,
    )
    .bind(user_uuid)
    .fetch_all(pool)
    .await?;

    let websites = sqlx::query_as::<_, WebsitesDto>(
        r#"
        SELECT uuid, group_uuid, title, url, url_lan, default_icon, local_icon_path, background_color, description, sort_order, is_deleted, rev, updated_at
        FROM websites
        WHERE user_uuid = ?1 AND is_deleted = 0
        ORDER BY sort_order IS NULL, sort_order ASC, updated_at DESC
        "#,
    )
    .bind(user_uuid)
    .fetch_all(pool)
    .await?;

    let mut grouped: HashMap<String, NavigationGroup> = groups
        .into_iter()
        .map(|group| {
            (
                group.uuid.clone(),
                NavigationGroup {
                    uuid: group.uuid,
                    name: group.name,
                    description: group.description,
                    sort_order: group.sort_order,
                    websites: Vec::new(),
                },
            )
        })
        .collect();

    for site in websites {
        if let Some(group) = grouped.get_mut(&site.group_uuid) {
            group.websites.push(NavigationWebsite {
                uuid: site.uuid,
                title: site.title,
                url: site.url,
                url_lan: site.url_lan,
                default_icon: site.default_icon,
                local_icon_path: site.local_icon_path,
                background_color: site.background_color,
                description: site.description,
                sort_order: site.sort_order,
            });
        }
    }

    let mut groups: Vec<NavigationGroup> = grouped.into_values().collect();

    // 对每个分组内的网站进行排序
    for group in groups.iter_mut() {
        group.websites.sort_by(|a, b| {
            compare_sort_then_title(a.sort_order, b.sort_order, &a.title, &b.title)
        });
    }

    // 最终的分组排序
    groups.sort_by(|a, b| compare_sort_then_title(a.sort_order, b.sort_order, &a.name, &b.name));

    Ok(groups)
}

/// 辅助排序：先按 sort_order，空值排在最后；再按标题字母排序。
fn compare_sort_then_title(
    a_sort: Option<i64>,
    b_sort: Option<i64>,
    a_title: &str,
    b_title: &str,
) -> Ordering {
    match (a_sort, b_sort) {
        (Some(a), Some(b)) => a
            .cmp(&b)
            .then_with(|| a_title.to_lowercase().cmp(&b_title.to_lowercase())),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        (None, None) => a_title.to_lowercase().cmp(&b_title.to_lowercase()),
    }
}
