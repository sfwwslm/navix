use chrono::{DateTime, Utc};
use std::path::{Component, Path};

/**
 * @fn parse_utc_timestamp
 * @brief 将一个符合 RFC3339 / ISO 8601 标准的字符串解析为带有时区信息的 DateTime<Utc>。
 *
 * @param s 要解析的时间字符串，例如 "2025-08-10T13:30:05.123Z"。
 * @return Result<DateTime<Utc>, chrono::ParseError> - 成功时返回 Ok(DateTime<Utc>)，失败时返回解析错误。
 */
pub fn parse_utc_timestamp(s: &str) -> Result<DateTime<Utc>, chrono::ParseError> {
    // 1. 使用 `parse_from_rfc3339` 来解析标准时间字符串。
    //    这个函数能够正确理解 "T" 分隔符和 "Z" (Zulu/UTC) 时区标识符。
    //    它会返回一个 `DateTime<FixedOffset>` 类型。
    let dt_with_offset = DateTime::parse_from_rfc3339(s)?;

    // 2. 将带固定偏移量的 DateTime 转换为我们最终需要的 DateTime<Utc> 类型。
    //    `with_timezone(&Utc)` 可以确保我们得到的是一个纯粹的 UTC 时间对象。
    Ok(dt_with_offset.with_timezone(&Utc))
}

/// 校验路径片段是否安全，防止出现 `.` 或 `..` 等穿越目录的情况
pub fn is_safe_path_segment(segment: &str) -> bool {
    if segment.is_empty() {
        return false;
    }

    let allowed = segment.bytes().all(|b| {
        matches!(
            b,
            b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'.' | b'-' | b'_'
        )
    });

    if !allowed {
        return false;
    }

    Path::new(segment)
        .components()
        .all(|c| matches!(c, Component::Normal(_)))
}
