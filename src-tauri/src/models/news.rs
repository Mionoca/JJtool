use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewsArticle {
    pub id: i64,
    pub title: String,
    pub summary: Option<String>,
    pub url: String,
    pub source: Option<String>,
    pub category: Option<String>,
    pub fetched_at: String,
    pub is_read: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNewsArticle {
    pub title: String,
    pub summary: Option<String>,
    pub url: String,
    pub source: Option<String>,
    pub category: Option<String>,
}
