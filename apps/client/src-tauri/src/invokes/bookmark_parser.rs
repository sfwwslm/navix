//! 该模块负责解析浏览器导出的 Netscape 书签格式的 HTML 文件。
//!
//! 主要功能是通过 `bookmark_parser` 函数实现，它会读取文件内容，
//! 并将其解析成一个由 `BookmarkGroup` 构成的层级结构，方便后续处理和使用。

use log::debug;
use scraper::{ElementRef, Html, Selector};
use std::fs;
use std::path::PathBuf;
use url::Url;

/// 代表一个单独的书签项目。
#[derive(serde::Serialize, Clone, Debug)]
pub struct BookmarkItem {
    /// 书签的标题。
    title: String,
    /// 书签指向的 URL。
    url: String,
}

/// 代表一个书签文件夹（或分组），包含一个名称和多个书签项。
#[derive(serde::Serialize, Clone, Debug)]
pub struct BookmarkGroup {
    /// 书签文件夹的名称。
    name: String,
    /// 该文件夹下包含的所有书签项（包括所有子文件夹内的书签）。
    items: Vec<BookmarkItem>,
}

/// 解析指定的 Netscape 书签 HTML 文件。
///
/// # Arguments
/// * `path` - 指向书签 HTML 文件的路径 (`PathBuf`)。
///
/// # Returns
/// * `Ok(Vec<BookmarkGroup>)` - 如果解析成功，返回一个包含所有书签组的向量。
/// * `Err(String)` - 如果文件读取或解析过程中发生错误，返回一个描述错误的字符串。
#[tauri::command]
pub async fn bookmark_parser(path: PathBuf) -> Result<Vec<BookmarkGroup>, String> {
    // 1. 读取文件内容
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    // 2. 使用 scraper 解析 HTML 字符串
    let document = Html::parse_document(&content);

    // 最终要返回的书签组列表
    let mut groups: Vec<BookmarkGroup> = Vec::new();
    // 临时存放那些直接位于根目录（“收藏夹栏”）下的书签
    let mut top_level_items: Vec<BookmarkItem> = Vec::new();

    // 3. 定位书签栏的根节点
    // Netscape 格式通过一个特殊的 `PERSONAL_TOOLBAR_FOLDER` 属性来标记根文件夹
    let toolbar_folder_selector = Selector::parse(r#"h3[PERSONAL_TOOLBAR_FOLDER="true"]"#).unwrap();
    if let Some(toolbar_h3) = document.select(&toolbar_folder_selector).next() {
        debug!("找到根目录: {:?}", toolbar_h3.inner_html());

        // 4. 找到根文件夹的父级 <dt> 节点，因为内容 <dl> 是它的子节点
        if let Some(toolbar_dt) = toolbar_h3.parent_element() {
            let content_selector = Selector::parse("dl").unwrap();
            // 在 <dt> 内部找到其子节点 <dl>，这个 <dl> 包含了所有的顶级书签和文件夹
            if let Some(main_content_dl) = toolbar_dt.select(&content_selector).next() {
                // 5. 遍历“收藏夹栏”下的所有直接子项目（<dt>）
                for node in main_content_dl.children().filter_map(ElementRef::wrap) {
                    // 关心 <dt> 元素
                    if node.value().name() != "dt" {
                        continue;
                    }

                    // 6. 区分处理文件夹和直接书签
                    // 情况 A: 当前 <dt> 是一个文件夹 (因为它内部包含 <h3>)
                    if let Some(h3) = node.select(&Selector::parse("h3").unwrap()).next() {
                        let group_name = h3.inner_html().trim().to_owned();
                        let mut items_in_group = Vec::new();

                        // 文件夹的内容 <dl> 是当前 <dt> 的子节点
                        if let Some(group_content_dl) = node.select(&content_selector).next() {
                            // 使用递归函数来填充这个组的所有书签
                            extract_links_recursive(group_content_dl, &mut items_in_group);
                        }

                        // 只有当文件夹非空时才添加到结果中
                        if !items_in_group.is_empty() {
                            groups.push(BookmarkGroup {
                                name: group_name,
                                items: items_in_group,
                            });
                        }
                    }
                    // 情况 B: 当前 <dt> 是一个直接的书签 (因为它内部包含 <a>)
                    else if let Some(a) = node.select(&Selector::parse("a").unwrap()).next()
                        && let Some(url) = a.value().attr("href")
                        && !url.is_empty()
                    {
                        let title = a.inner_html();
                        // 如果书签没有标题，则尝试从 URL 中提取域名作为标题
                        let final_title = if title.trim().is_empty() {
                            Url::parse(url)
                                .ok()
                                .and_then(|u| u.host_str().map(String::from))
                                .unwrap_or_else(|| "Untitled".to_string())
                        } else {
                            title
                        };
                        // 将解析出的顶层书签暂存起来
                        top_level_items.push(BookmarkItem {
                            title: final_title,
                            url: url.to_string(),
                        });
                    }
                }
            }
        }

        // 7. 将所有顶层书签整理成一个特殊的组
        // 循环结束后，如果收集到了顶层书签，将它们放入一个以“收藏夹栏”命名的组
        if !top_level_items.is_empty() {
            groups.insert(
                0, // 插入到列表的最前面
                BookmarkGroup {
                    name: toolbar_h3.inner_html().trim().to_owned(),
                    items: top_level_items,
                },
            );
        }
    }
    Ok(groups)
}

/// 递归地从给定的 `<dl>` 元素中收集所有的书签链接。
///
/// 这个函数会遍历一个 `<dl>` 列表，并将其中的书签项（`<a>`）添加到 `items` 向量中。
/// 如果遇到子文件夹（`<dt>` 中包含 `<h3>`），它会递归地调用自身来处理子文件夹的内容。
///
/// # Arguments
/// * `dl_element` - 一个指向 `<dl>` 元素的 `ElementRef`，代表一个文件夹的内容列表。
/// * `items` - 一个可变的 `BookmarkItem` 向量的引用，用于累积所有找到的书签。
fn extract_links_recursive(dl_element: ElementRef, items: &mut Vec<BookmarkItem>) {
    // 遍历当前 <dl> 下的所有直接子元素
    for dt_node in dl_element.children().filter_map(ElementRef::wrap) {
        // 在 Netscape 格式中，每个书签或文件夹都由一个 <dt> 元素表示
        if dt_node.value().name() != "dt" {
            continue;
        }

        // 区分 <dt> 是文件夹还是书签
        // 情况 A: 这个 <dt> 是一个子文件夹 (因为它包含 <h3>)
        if let Some(_h3) = dt_node.select(&Selector::parse("h3").unwrap()).next() {
            // 子文件夹的内容在它自己的子节点 <dl> 中
            if let Some(sub_dl) = dt_node.select(&Selector::parse("dl").unwrap()).next() {
                // 对这个子文件夹的 <dl> 进行递归调用，把找到的书签也添加到同一个 `items` 列表中
                extract_links_recursive(sub_dl, items);
            }
        }
        // 情况 B: 这个 <dt> 是一个书签 (因为它包含 <a>)
        else if let Some(a) = dt_node.select(&Selector::parse("a").unwrap()).next()
            && let Some(url) = a.value().attr("href")
            && !url.is_empty()
        {
            let title = a.inner_html();
            let final_title = if title.trim().is_empty() {
                Url::parse(url)
                    .ok()
                    .and_then(|u| u.host_str().map(String::from))
                    .unwrap_or_else(|| "Untitled".to_string())
            } else {
                title
            };
            items.push(BookmarkItem {
                title: final_title,
                url: url.to_string(),
            });
        }
    }
}

/// 一个辅助 Trait，用于简化在 `scraper` 的 DOM 树中的元素遍历。
trait ElementTraversal {
    /// 获取当前元素的直接父级*元素*节点。
    ///
    /// 这个方法会自动处理 `scraper` 中 `parent()` 返回 `NodeRef` 的情况，
    /// 将其安全地转换为 `Option<ElementRef>`，从而跳过文本节点等非元素节点。
    fn parent_element(&self) -> Option<ElementRef<'_>>;
}

impl<'a> ElementTraversal for ElementRef<'a> {
    fn parent_element(&self) -> Option<ElementRef<'_>> {
        self.parent().and_then(ElementRef::wrap)
    }
}
