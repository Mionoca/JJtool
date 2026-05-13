use std::fs;

use rusqlite::params;

use super::connection::Database;
use crate::models::clipboard::{ClipboardFilter, ClipboardItem, CreateClipboardItem};

type ClipboardAssetRow = (String, String, Option<String>, Option<String>);

fn remove_clipboard_assets(content_type: &str, content: &str, preview: Option<&str>, image_data: Option<&str>) {
    if content_type != "image" {
        return;
    }

    for path in [Some(content), preview, image_data].into_iter().flatten() {
        if path.starts_with("http://") || path.starts_with("https://") {
            continue;
        }
        let _ = fs::remove_file(path);
    }
}

impl Database {
    pub fn get_clipboard_item(&self, id: i64) -> Result<ClipboardItem, String> {
        self.with_conn(|conn| {
            conn.query_row(
                "SELECT id, content, content_type, preview, mime_type, image_data, source_app,
                 is_favorite, is_pinned, tags, created_at, expires_at
                 FROM clipboard_history WHERE id = ?1",
                params![id],
                |row| {
                    let tags_str: String = row.get(9)?;
                    let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
                    Ok(ClipboardItem {
                        id: row.get(0)?,
                        content: row.get(1)?,
                        content_type: row.get(2)?,
                        preview: row.get(3)?,
                        mime_type: row.get(4)?,
                        image_data: row.get(5)?,
                        source_app: row.get(6)?,
                        is_favorite: row.get::<_, i32>(7)? != 0,
                        is_pinned: row.get::<_, i32>(8)? != 0,
                        tags,
                        created_at: row.get(10)?,
                        expires_at: row.get(11)?,
                    })
                },
            )
            .map_err(|e| e.to_string())
        })
    }

    pub fn insert_clipboard(&self, item: &CreateClipboardItem) -> Result<ClipboardItem, String> {
        self.with_conn(|conn| {
            let now = chrono::Local::now();
            let expires = now + chrono::Duration::days(3);
            let now_str = now.format("%Y-%m-%d %H:%M:%S").to_string();
            let expires_str = expires.format("%Y-%m-%d %H:%M:%S").to_string();

            let recent_exists: bool = conn
                .query_row(
                    "SELECT COUNT(*) > 0 FROM clipboard_history
                     WHERE content = ?1 AND content_type = ?2
                     AND created_at > datetime('now', 'localtime', '-5 seconds')",
                    params![item.content, item.content_type],
                    |row| row.get(0),
                )
                .unwrap_or(false);

            if recent_exists {
                return Err("Duplicate".to_string());
            }

            conn.execute("UPDATE clipboard_history SET is_pinned = 0", [])
                .map_err(|e| e.to_string())?;

            conn.execute(
                "INSERT INTO clipboard_history
                 (content, content_type, preview, mime_type, image_data, source_app,
                  created_at, expires_at, is_pinned)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1)",
                params![
                    item.content,
                    item.content_type,
                    item.preview,
                    item.mime_type,
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
                preview: item.preview.clone(),
                mime_type: item.mime_type.clone(),
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
                "SELECT id, content, content_type, preview, mime_type, image_data, source_app,
                 is_favorite, is_pinned, tags, created_at, expires_at
                 FROM clipboard_history
                 WHERE expires_at > datetime('now', 'localtime')",
            );

            if let Some(ref search) = filter.search {
                if !search.is_empty() {
                    let escaped = search.replace('\'', "''");
                    sql.push_str(&format!(" AND content LIKE '%{}%'", escaped));
                }
            }
            if let Some(ref ct) = filter.content_type {
                let escaped = ct.replace('\'', "''");
                sql.push_str(&format!(" AND content_type = '{}'", escaped));
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
                    let tags_str: String = row.get(9)?;
                    let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
                    Ok(ClipboardItem {
                        id: row.get(0)?,
                        content: row.get(1)?,
                        content_type: row.get(2)?,
                        preview: row.get(3)?,
                        mime_type: row.get(4)?,
                        image_data: row.get(5)?,
                        source_app: row.get(6)?,
                        is_favorite: row.get::<_, i32>(7)? != 0,
                        is_pinned: row.get::<_, i32>(8)? != 0,
                        tags,
                        created_at: row.get(10)?,
                        expires_at: row.get(11)?,
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
            let asset: Option<ClipboardAssetRow> = conn
                .query_row(
                    "SELECT content_type, content, preview, image_data FROM clipboard_history WHERE id = ?1",
                    params![id],
                    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
                )
                .ok();

            conn.execute("DELETE FROM clipboard_history WHERE id = ?1", params![id])
                .map_err(|e| e.to_string())?;

            if let Some((content_type, content, preview, image_data)) = asset {
                remove_clipboard_assets(&content_type, &content, preview.as_deref(), image_data.as_deref());
            }

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
            let mut stmt = conn
                .prepare(
                    "SELECT content_type, content, preview, image_data
                     FROM clipboard_history WHERE is_favorite = 0 AND is_pinned = 0",
                )
                .map_err(|e| e.to_string())?;
            let assets = stmt
                .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)))
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<ClipboardAssetRow>, _>>()
                .map_err(|e| e.to_string())?;

            conn.execute(
                "DELETE FROM clipboard_history WHERE is_favorite = 0 AND is_pinned = 0",
                [],
            )
            .map_err(|e| e.to_string())?;

            for (content_type, content, preview, image_data) in assets {
                remove_clipboard_assets(&content_type, &content, preview.as_deref(), image_data.as_deref());
            }

            Ok(())
        })
    }

    pub fn cleanup_expired(&self) -> Result<(), String> {
        self.with_conn(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT content_type, content, preview, image_data
                     FROM clipboard_history
                     WHERE expires_at < datetime('now', 'localtime') AND is_favorite = 0",
                )
                .map_err(|e| e.to_string())?;
            let assets = stmt
                .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)))
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<ClipboardAssetRow>, _>>()
                .map_err(|e| e.to_string())?;

            conn.execute(
                "DELETE FROM clipboard_history WHERE expires_at < datetime('now', 'localtime') AND is_favorite = 0",
                [],
            )
            .map_err(|e| e.to_string())?;

            for (content_type, content, preview, image_data) in assets {
                remove_clipboard_assets(&content_type, &content, preview.as_deref(), image_data.as_deref());
            }

            Ok(())
        })
    }
}
