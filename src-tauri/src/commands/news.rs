use std::sync::Arc;
use tauri::State;
use crate::db::Database;
use crate::models::news::NewsArticle;

#[tauri::command]
pub fn get_news_articles(db: State<'_, Arc<Database>>, limit: Option<i64>) -> Result<Vec<NewsArticle>, String> {
    db.get_news_articles(limit.unwrap_or(50))
}

#[tauri::command]
pub fn mark_news_read(db: State<'_, Arc<Database>>, id: i64) -> Result<(), String> {
    db.mark_news_read(id)
}

#[tauri::command]
pub fn refresh_news(db: State<'_, Arc<Database>>) -> Result<usize, String> {
    crate::services::news_fetcher::fetch_news(&db)
}
