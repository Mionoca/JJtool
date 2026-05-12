use rusqlite::params;
use super::connection::Database;
use crate::models::clipboard::{ClipboardItem, ClipboardFilter, CreateClipboardItem};

impl Database {
    pub fn insert_clipboard(&self, item: &CreateClipboardItem) -> Result<ClipboardItem, String> {
        self.with_conn(|conn| {
            let now = chrono::Local::now();
            let expires = now + chrono::Duration::days(3);
            let now_str = now.format("%Y-%m-%d %H:%M:%S").to_string();
            let expires_str = expires.format("%Y-%m-%d %H:%M:%S").to_string();

            // Deduplicate: check if same content exists in last 5 seconds
            let recent_exists: bool = conn
                .query_row(
                    "SELECT COUNT(*) > 0 FROM clipboard_history
                     WHERE content = ?1 AND created_at > datetime('now', 'localtime', '-5 seconds')",
                    params![item.content],
                    |row| row.get(0),
                )
                .unwrap_or(false);

            if recent_exists {
                return Err("Duplicate".to_string());
            }

            // Unpin previous items
            conn.execute("UPDATE clipboard_history SET is_pinned = 0", [])
                .map_err(|e| e.to_string())?;

            conn.execute(
                "INSERT INTO clipboard_history (content, content_type, image_data, source_app, created_at, expires_at, is_pinned)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)",
                params![
                    item.content,
                    item.content_type,
                    item.image_data,
                    item.source_app,
                    now_str,
                    expires_str,
                ],
            )
            .map_err(|e| e.to_string())?;

            let id = conn.last_insert_rowid();

            Ok(ClipboardItem {
                id,
                content: item.content.clone(),
                content_type: item.content_type.clone(),
                image_data: item.image_data.clone(),
                source_app: item.source_app.clone(),
                is_favorite: false,
                is_pinned: true,
                tags: vec![],
                created_at: now_str,
                expires_at: expires_str,
            })
        })
    }

    pub fn get_clipboard_history(&self, filter: &ClipboardFilter) -> Result<Vec<ClipboardItem>, String> {
        self.with_conn(|conn| {
            let mut sql = String::from(
                "SELECT id, content, content_type, image_data, source_app,
                 is_favorite, is_pinned, tags, created_at, expires_at
                 FROM clipboard_history
                 WHERE expires_at > datetime('now', 'localtime')"
            );

            if let Some(ref search) = filter.search {
                if !search.is_empty() {
                    sql.push_str(&format!(" AND content LIKE '%{}%'", search));
                }
            }
            if let Some(ref ct) = filter.content_type {
                sql.push_str(&format!(" AND content_type = '{}'", ct));
            }
            if Some(true) == filter.favorites_only {
                sql.push_str(" AND is_favorite = 1");
            }

            sql.push_str(" ORDER BY is_pinned DESC, created_at DESC");

            let limit = filter.limit.unwrap_or(100);
            let offset = filter.offset.unwrap_or(0);
            sql.push_str(&format!(" LIMIT {} OFFSET {}", limit, offset));

            let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([], |row| {
                    let tags_str: String = row.get(7)?;
                    let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
                    Ok(ClipboardItem {
                        id: row.get(0)?,
                        content: row.get(1)?,
                        content_type: row.get(2)?,
                        image_data: row.get(3)?,
                        source_app: row.get(4)?,
                        is_favorite: row.get::<_, i32>(5)? != 0,
                        is_pinned: row.get::<_, i32>(6)? != 0,
                        tags,
                        created_at: row.get(8)?,
                        expires_at: row.get(9)?,
                    })
                })
                .map_err(|e| e.to_string())?;

            let mut items = Vec::new();
            for row in rows {
                items.push(row.map_err(|e| e.to_string())?);
            }
            Ok(items)
        })
    }

    pub fn delete_clipboard(&self, id: i64) -> Result<(), String> {
        self.with_conn(|conn| {
            conn.execute("DELETE FROM clipboard_history WHERE id = ?1", params![id])
                .map_err(|e| e.to_string())?;
            Ok(())
        })
    }

    pub fn toggle_favorite(&self, id: i64) -> Result<bool, String> {
        self.with_conn(|conn| {
            conn.execute(
                "UPDATE clipboard_history SET is_favorite = NOT is_favorite WHERE id = ?1",
                params![id],
            )
            .map_err(|e| e.to_string())?;

            let fav: bool = conn
                .query_row(
                    "SELECT is_favorite FROM clipboard_history WHERE id = ?1",
                    params![id],
                    |row| row.get::<_, i32>(0),
                )
                .map_err(|e| e.to_string())?
                != 0;

            Ok(fav)
        })
    }

    pub fn clear_clipboard_history(&self) -> Result<(), String> {
        self.with_conn(|conn| {
            conn.execute(
                "DELETE FROM clipboard_history WHERE is_favorite = 0 AND is_pinned = 0",
                [],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        })
    }

    pub fn cleanup_expired(&self) -> Result<(), String> {
        self.with_conn(|conn| {
            conn.execute(
                "DELETE FROM clipboard_history WHERE expires_at < datetime('now', 'localtime') AND is_favorite = 0",
                [],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        })
    }
}
