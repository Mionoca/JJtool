use chrono::{Datelike, Duration, Local, NaiveDateTime};
use regex::Regex;

/// Parse natural language time expressions into a datetime string.
/// Supports Chinese time expressions like:
/// - "明天晚上七点" → tomorrow 19:00
/// - "40分钟后" → now + 40 min
/// - "周五下午" → next Friday 14:00
/// - "下周一上午10点" → next Monday 10:00
pub fn parse_natural_time(input: &str) -> Option<String> {
    let now = Local::now();
    let text = input.trim();

    // Try relative time: X分钟后, X小时后
    if let Some(dt) = parse_relative_time(text, now) {
        return Some(dt.format("%Y-%m-%d %H:%M:%S").to_string());
    }

    // Try "明天/后天/大后天" + time
    if let Some(dt) = parse_day_offset_time(text, now) {
        return Some(dt.format("%Y-%m-%d %H:%M:%S").to_string());
    }

    // Try weekday: 周X + time
    if let Some(dt) = parse_weekday_time(text, now) {
        return Some(dt.format("%Y-%m-%d %H:%M:%S").to_string());
    }

    // Try absolute: X月X日/X号 + time
    if let Some(dt) = parse_absolute_date_time(text, now) {
        return Some(dt.format("%Y-%m-%d %H:%M:%S").to_string());
    }

    // Try time only: 下午三点, 晚上8点 → today at that time
    if let Some(dt) = parse_time_only(text, now) {
        return Some(dt.format("%Y-%m-%d %H:%M:%S").to_string());
    }

    // Try ISO format directly
    if let Ok(dt) = NaiveDateTime::parse_from_str(text, "%Y-%m-%d %H:%M:%S") {
        return Some(dt.format("%Y-%m-%d %H:%M:%S").to_string());
    }

    None
}

fn parse_relative_time(text: &str, now: chrono::DateTime<Local>) -> Option<chrono::DateTime<Local>> {
    let re = Regex::new(r"(\d+)\s*(分钟|小时|天)后").ok()?;
    if let Some(caps) = re.captures(text) {
        let num: i64 = caps.get(1)?.as_str().parse().ok()?;
        let unit = caps.get(2)?.as_str();
        match unit {
            "分钟" => Some(now + Duration::minutes(num)),
            "小时" => Some(now + Duration::hours(num)),
            "天" => Some(now + Duration::days(num)),
            _ => None,
        }
    } else {
        None
    }
}

fn parse_day_offset_time(
    text: &str,
    now: chrono::DateTime<Local>,
) -> Option<chrono::DateTime<Local>> {
    let day_offset = if text.contains("大后天") {
        3
    } else if text.contains("后天") {
        2
    } else if text.contains("明天") {
        1
    } else if text.contains("今天") {
        0
    } else {
        return None;
    };

    let target_date = now.date_naive() + Duration::days(day_offset);
    let time = extract_time_from_text(text).unwrap_or((9, 0)); // default 9:00
    target_date
        .and_hms_opt(time.0, time.1, 0)
        .map(|dt| dt.and_local_timezone(now.timezone()).unwrap())
}

fn parse_weekday_time(
    text: &str,
    now: chrono::DateTime<Local>,
) -> Option<chrono::DateTime<Local>> {
    let weekdays = [
        ("周一", 1u32),
        ("周二", 2),
        ("周三", 3),
        ("周四", 4),
        ("周五", 5),
        ("周六", 6),
        ("周日", 7),
        ("周天", 7),
        ("星期一", 1),
        ("星期二", 2),
        ("星期三", 3),
        ("星期四", 4),
        ("星期五", 5),
        ("星期六", 6),
        ("星期天", 7),
        ("星期日", 7),
    ];

    let mut target_weekday = None;
    for (name, day) in &weekdays {
        if text.contains(name) {
            target_weekday = Some(*day);
            break;
        }
    }

    let weekday = target_weekday?;
    let current_weekday = now.weekday().num_days_from_monday() as u32 + 1;
    let mut days_ahead = weekday as i64 - current_weekday as i64;
    if days_ahead <= 0 {
        days_ahead += 7;
    }
    if text.contains("下") {
        days_ahead += 7;
    }

    let target_date = now.date_naive() + Duration::days(days_ahead);
    let time = extract_time_from_text(text).unwrap_or((9, 0));
    target_date
        .and_hms_opt(time.0, time.1, 0)
        .map(|dt| dt.and_local_timezone(now.timezone()).unwrap())
}

fn parse_absolute_date_time(
    text: &str,
    now: chrono::DateTime<Local>,
) -> Option<chrono::DateTime<Local>> {
    let re = Regex::new(r"(\d{1,2})月(\d{1,2})[日号]").ok()?;
    if let Some(caps) = re.captures(text) {
        let month: u32 = caps.get(1)?.as_str().parse().ok()?;
        let day: u32 = caps.get(2)?.as_str().parse().ok()?;
        let year = if month < now.month() || (month == now.month() && day < now.day()) {
            now.year() + 1
        } else {
            now.year()
        };
        let date = chrono::NaiveDate::from_ymd_opt(year, month, day)?;
        let time = extract_time_from_text(text).unwrap_or((9, 0));
        return date
            .and_hms_opt(time.0, time.1, 0)
            .map(|dt| dt.and_local_timezone(now.timezone()).unwrap());
    }
    None
}

fn parse_time_only(
    text: &str,
    now: chrono::DateTime<Local>,
) -> Option<chrono::DateTime<Local>> {
    let time = extract_time_from_text(text)?;
    let mut target = now.date_naive().and_hms_opt(time.0, time.1, 0)?;
    let target_tz = target.and_local_timezone(now.timezone()).unwrap();
    if target_tz <= now {
        target = (now.date_naive() + Duration::days(1)).and_hms_opt(time.0, time.1, 0)?;
    }
    Some(target.and_local_timezone(now.timezone()).unwrap())
}

/// Extract hour and minute from Chinese time text.
/// Returns (hour, minute).
fn extract_time_from_text(text: &str) -> Option<(u32, u32)> {
    // Period of day modifiers
    let period_offset = if text.contains("凌晨") {
        Some(0)
    } else if text.contains("早上") || text.contains("上午") {
        Some(0)
    } else if text.contains("中午") {
        Some(12)
    } else if text.contains("下午") {
        Some(12)
    } else if text.contains("晚上") {
        Some(12) // Will be added to hour
    } else {
        None
    };

    // Try "X点Y分" / "X:Y"
    let re1 = Regex::new(r"(\d{1,2})[:\s：]?(\d{1,2})?[点分]").ok()?;
    if let Some(caps) = re1.captures(text) {
        let mut hour: u32 = caps.get(1)?.as_str().parse().ok()?;
        let minute: u32 = caps
            .get(2)
            .and_then(|m| m.as_str().parse().ok())
            .unwrap_or(0);

        // Apply period offset for 下午/晚上
        if let Some(offset) = period_offset {
            if offset == 12 && hour < 12 {
                hour += 12;
            }
        }
        return Some((hour, minute));
    }

    // Try "X点" / "X时"
    let re2 = Regex::new(r"(\d{1,2})[点时]").ok()?;
    if let Some(caps) = re2.captures(text) {
        let mut hour: u32 = caps.get(1)?.as_str().parse().ok()?;
        if let Some(offset) = period_offset {
            if offset == 12 && hour < 12 {
                hour += 12;
            }
        }
        return Some((hour, 0));
    }

    // Try Chinese number: 七点, 八点半
    let chinese_nums = [
        ("一", 1), ("二", 2), ("两", 2), ("三", 3), ("四", 4),
        ("五", 5), ("六", 6), ("七", 7), ("八", 8), ("九", 9),
        ("十", 10), ("十一", 11), ("十二", 12),
    ];

    for (cn, num) in &chinese_nums {
        let pattern = format!("{}点", cn);
        if text.contains(&pattern) {
            let mut hour = *num;
            if let Some(offset) = period_offset {
                if offset == 12 && hour < 12 {
                    hour += 12;
                }
            }
            let minute = if text.contains("半") { 30 } else { 0 };
            return Some((hour as u32, minute));
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_relative_time() {
        let result = parse_natural_time("40分钟后");
        assert!(result.is_some());
        println!("40分钟后 = {:?}", result);
    }

    #[test]
    fn test_tomorrow() {
        let result = parse_natural_time("明天上午10点");
        assert!(result.is_some());
        println!("明天上午10点 = {:?}", result);
    }

    #[test]
    fn test_weekday() {
        let result = parse_natural_time("周五下午3点");
        assert!(result.is_some());
        println!("周五下午3点 = {:?}", result);
    }
}
