use rusqlite::params;
use super::connection::Database;
use crate::models::news::{CreateNewsArticle, NewsArticle};

impl Database {
    pub fn insert_news_article(&self, article: &CreateNewsArticle) -> Result<NewsArticle, String> {
        self.with_conn(|conn| {
            // Deduplicate by URL
            let exists: bool = conn
                .query_row(
                    "SELECT COUNT(*) FROM news_articles WHERE url = ?1",
                    params![article.url],
                    |row| row.get::<_, i64>(0),
                )
                .map_err(|e| e.to_string())?
                > 0;

            if exists {
                return Err("duplicate".to_string());
            }

            conn.execute(
                "INSERT INTO news_articles (title, summary, url, source, category) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    article.title,
                    article.summary,
                    article.url,
                    article.source,
                    article.category,
                ],
            )
            .map_err(|e| e.to_string())?;

            let id = conn.last_insert_rowid();
            Ok(NewsArticle {
                id,
                title: article.title.clone(),
                summary: article.summary.clone(),
                url: article.url.clone(),
                source: article.source.clone(),
                category: article.category.clone(),
                fetched_at: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
                is_read: false,
            })
        })
    }

    pub fn get_news_articles(&self, limit: i64) -> Result<Vec<NewsArticle>, String> {
        self.with_conn(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, title, summary, url, source, category, fetched_at, is_read
                     FROM news_articles ORDER BY fetched_at DESC LIMIT ?1",
                )
                .map_err(|e| e.to_string())?;

            let rows = stmt
                .query_map(params![limit], |row| {
                    Ok(NewsArticle {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        summary: row.get(2)?,
                        url: row.get(3)?,
                        source: row.get(4)?,
                        category: row.get(5)?,
                        fetched_at: row.get(6)?,
                        is_read: row.get::<_, i32>(7)? != 0,
                    })
                })
                .map_err(|e| e.to_string())?;

            let mut articles = Vec::new();
            for row in rows {
                articles.push(row.map_err(|e| e.to_string())?);
            }
            Ok(articles)
        })
    }

    pub fn mark_news_read(&self, id: i64) -> Result<(), String> {
        self.with_conn(|conn| {
            conn.execute(
                "UPDATE news_articles SET is_read = 1 WHERE id = ?1",
                params![id],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        })
    }

    pub fn delete_old_news(&self, days: i64) -> Result<(), String> {
        self.with_conn(|conn| {
            conn.execute(
                "DELETE FROM news_articles WHERE fetched_at < datetime('now', 'localtime', ?1)",
                params![format!("-{} days", days)],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        })
    }
}
