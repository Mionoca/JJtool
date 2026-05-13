use std::sync::Arc;
use crate::db::Database;
use crate::models::news::CreateNewsArticle;

/// RSS feed sources
const RSS_FEEDS: &[(&str, &str)] = &[
    ("https://feedx.net/rss/solidot.xml", "Solidot"),
    ("https://rsshub.app/36kr/newsflashes", "36氪快讯"),
    ("https://rsshub.app/zhihu/hot", "知乎热榜"),
];

/// Fetch news from RSS feeds and store in database
pub fn fetch_news(db: &Arc<Database>) -> Result<usize, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .user_agent("JJtool/0.1")
        .build()
        .map_err(|e| e.to_string())?;

    let mut total = 0;

    for (url, source_name) in RSS_FEEDS {
        match fetch_feed(&client, url, source_name) {
            Ok(articles) => {
                for article in articles {
                    match db.insert_news_article(&article) {
                        Ok(_) => total += 1,
                        Err(e) if e == "duplicate" => continue,
                        Err(e) => eprintln!("News insert error: {}", e),
                    }
                }
            }
            Err(e) => eprintln!("Failed to fetch {}: {}", source_name, e),
        }
    }

    // Clean up articles older than 7 days
    let _ = db.delete_old_news(7);

    Ok(total)
}

fn fetch_feed(
    client: &reqwest::blocking::Client,
    url: &str,
    source_name: &str,
) -> Result<Vec<CreateNewsArticle>, String> {
    let response = client.get(url).send().map_err(|e| e.to_string())?;
    let body = response.text().map_err(|e| e.to_string())?;

    parse_rss(&body, source_name)
}

fn parse_rss(xml: &str, source_name: &str) -> Result<Vec<CreateNewsArticle>, String> {
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
                            title: title.trim().to_string(),
                            summary: if description.is_empty() {
                                None
                            } else {
                                Some(description.trim().to_string())
                            },
                            url: link.trim().to_string(),
                            source: Some(source_name.to_string()),
                            category: None,
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
            Ok(Event::Eof) => break,
            Err(_) => continue,
            _ => {}
        }
    }

    Ok(articles)
}
