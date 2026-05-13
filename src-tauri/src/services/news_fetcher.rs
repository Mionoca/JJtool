use std::sync::Arc;

use crate::db::Database;
use crate::models::news::CreateNewsArticle;

pub fn fetch_news(db: &Arc<Database>) -> Result<usize, String> {
    let raw_keywords = db
        .get_setting("news_keywords")?
        .unwrap_or_default();
    let keywords = parse_keywords(&raw_keywords);

    if keywords.is_empty() {
        return Err("请先设置兴趣关键词".to_string());
    }

    fetch_news_by_keywords(db, &keywords)
}

pub fn fetch_news_by_keywords(db: &Arc<Database>, keywords: &[String]) -> Result<usize, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .user_agent("JJtool/0.1 (+https://github.com/Mionoca/JJtool)")
        .build()
        .map_err(|e| e.to_string())?;

    let mut total = 0;
    let mut failures = Vec::new();

    for keyword in keywords {
        let url = format!(
            "https://www.bing.com/news/search?q={}&format=rss&setlang=zh-CN",
            percent_encode(keyword)
        );
        let source_name = format!("Bing News / {}", keyword);

        match fetch_feed(&client, &url, &source_name, Some(keyword)) {
            Ok(articles) => {
                for article in articles {
                    match db.insert_news_article(&article) {
                        Ok(_) => total += 1,
                        Err(e) if e == "duplicate" => continue,
                        Err(e) => failures.push(format!("{} 写入失败：{}", keyword, e)),
                    }
                }
            }
            Err(e) => failures.push(format!("{}：{}", keyword, e)),
        }
    }

    let _ = db.delete_old_news(7);

    if total == 0 && !failures.is_empty() {
        Err(failures.join("; "))
    } else {
        Ok(total)
    }
}

fn parse_keywords(raw: &str) -> Vec<String> {
    raw.split(|ch| matches!(ch, ',' | '，' | '\n' | ';' | '；' | '、'))
        .map(str::trim)
        .filter(|keyword| !keyword.is_empty())
        .map(ToString::to_string)
        .collect()
}

fn fetch_feed(
    client: &reqwest::blocking::Client,
    url: &str,
    source_name: &str,
    keyword: Option<&str>,
) -> Result<Vec<CreateNewsArticle>, String> {
    let response = client
        .get(url)
        .send()
        .map_err(|e| format!("请求失败：{}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }

    let body = response.text().map_err(|e| e.to_string())?;
    parse_rss(&body, source_name, keyword)
}

fn parse_rss(
    xml: &str,
    source_name: &str,
    keyword: Option<&str>,
) -> Result<Vec<CreateNewsArticle>, String> {
    use quick_xml::events::Event;
    use quick_xml::Reader;

    let mut reader = Reader::from_str(xml);
    let mut articles = Vec::new();

    let mut in_item = false;
    let mut current_tag = String::new();
    let mut title = String::new();
    let mut link = String::new();
    let mut description = String::new();

    loop {
        match reader.read_event() {
            Ok(Event::Start(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if tag == "item" {
                    in_item = true;
                    title.clear();
                    link.clear();
                    description.clear();
                }
                if in_item {
                    current_tag = tag;
                }
            }
            Ok(Event::End(ref e)) => {
                let tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                if tag == "item" && in_item {
                    in_item = false;
                    if !title.is_empty() && !link.is_empty() {
                        articles.push(CreateNewsArticle {
                            title: strip_html(title.trim()),
                            summary: if description.is_empty() {
                                None
                            } else {
                                Some(strip_html(description.trim()))
                            },
                            url: link.trim().to_string(),
                            source: Some(source_name.to_string()),
                            category: Some(keyword.unwrap_or("keyword").to_string()),
                        });
                    }
                }
                if tag == "item" {
                    current_tag.clear();
                }
            }
            Ok(Event::Text(ref e)) => {
                if in_item {
                    let text = e.unescape().map_err(|e| e.to_string())?;
                    match current_tag.as_str() {
                        "title" => title.push_str(&text),
                        "link" => link.push_str(&text),
                        "description" => description.push_str(&text),
                        _ => {}
                    }
                }
            }
            Ok(Event::CData(ref e)) => {
                if in_item {
                    let text = String::from_utf8_lossy(e.as_ref());
                    if current_tag == "description" {
                        description.push_str(&text);
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("RSS 解析失败：{}", e)),
            _ => {}
        }
    }

    Ok(articles)
}

fn strip_html(value: &str) -> String {
    let mut result = String::new();
    let mut in_tag = false;

    for ch in value.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => result.push(ch),
            _ => {}
        }
    }

    result.trim().to_string()
}

fn percent_encode(value: &str) -> String {
    let mut encoded = String::new();
    for byte in value.as_bytes() {
        match *byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(*byte as char)
            }
            b' ' => encoded.push('+'),
            other => encoded.push_str(&format!("%{:02X}", other)),
        }
    }
    encoded
}
