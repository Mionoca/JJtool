use rusqlite::params;
use super::connection::Database;
use crate::models::sticky::{CreateStickyNote, StickyNote, UpdateStickyNote};

impl Database {
    pub fn insert_sticky_note(&self, item: &CreateStickyNote) -> Result<StickyNote, String> {
        self.with_conn(|conn| {
            let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
            let content_type = item.content_type.as_deref().unwrap_or("markdown");
            let color = item.color.as_deref().unwrap_or("#FFFBEB");
            let priority = item.priority.unwrap_or(0);

            conn.execute(
                "INSERT INTO sticky_notes (title, content, content_type, color, priority, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![item.title, item.content, content_type, color, priority, now, now],
            )
            .map_err(|e| e.to_string())?;

            let id = conn.last_insert_rowid();
            Ok(StickyNote {
                id,
                title: item.title.clone(),
                content: item.content.clone(),
                content_type: content_type.to_string(),
                color: color.to_string(),
                priority,
                is_pinned: false,
                sort_order: 0,
                is_archived: false,
                created_at: now.clone(),
                updated_at: now,
            })
        })
    }

    pub fn get_all_sticky_notes(&self) -> Result<Vec<StickyNote>, String> {
        self.with_conn(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, title, content, content_type, color, priority,
                     is_pinned, sort_order, is_archived, created_at, updated_at
                     FROM sticky_notes WHERE is_archived = 0
                     ORDER BY is_pinned DESC, sort_order ASC, created_at DESC",
                )
                .map_err(|e| e.to_string())?;

            let rows = stmt
                .query_map([], |row| {
                    Ok(StickyNote {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        content: row.get(2)?,
                        content_type: row.get(3)?,
                        color: row.get(4)?,
                        priority: row.get(5)?,
                        is_pinned: row.get::<_, i32>(6)? != 0,
                        sort_order: row.get(7)?,
                        is_archived: row.get::<_, i32>(8)? != 0,
                        created_at: row.get(9)?,
                        updated_at: row.get(10)?,
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

    pub fn update_sticky_note(&self, id: i64, update: &UpdateStickyNote) -> Result<(), String> {
        self.with_conn(|conn| {
            let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

            // Build dynamic UPDATE
            let mut sets = vec!["updated_at = ?1".to_string()];
            let mut param_index = 2;

            if update.title.is_some() {
                sets.push(format!("title = ?{}", param_index));
                param_index += 1;
            }
            if update.content.is_some() {
                sets.push(format!("content = ?{}", param_index));
                param_index += 1;
            }
            if update.color.is_some() {
                sets.push(format!("color = ?{}", param_index));
                param_index += 1;
            }
            if update.priority.is_some() {
                sets.push(format!("priority = ?{}", param_index));
                param_index += 1;
            }
            if update.is_pinned.is_some() {
                sets.push(format!("is_pinned = ?{}", param_index));
                param_index += 1;
            }
            if update.sort_order.is_some() {
                sets.push(format!("sort_order = ?{}", param_index));
                #[allow(unused_assignments)]
                {
                    param_index += 1;
                }
            }

            let sql = format!("UPDATE sticky_notes SET {} WHERE id = ?{}", sets.join(", "), param_index);

            // Build params dynamically
            let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now)];
            if let Some(ref title) = update.title {
                param_values.push(Box::new(title.clone()));
            }
            if let Some(ref content) = update.content {
                param_values.push(Box::new(content.clone()));
            }
            if let Some(ref color) = update.color {
                param_values.push(Box::new(color.clone()));
            }
            if let Some(priority) = update.priority {
                param_values.push(Box::new(priority));
            }
            if let Some(is_pinned) = update.is_pinned {
                param_values.push(Box::new(is_pinned as i32));
            }
            if let Some(sort_order) = update.sort_order {
                param_values.push(Box::new(sort_order));
            }
            param_values.push(Box::new(id));

            let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
            conn.execute(&sql, params_ref.as_slice())
                .map_err(|e| e.to_string())?;
            Ok(())
        })
    }

    pub fn delete_sticky_note(&self, id: i64) -> Result<(), String> {
        self.with_conn(|conn| {
            conn.execute("DELETE FROM sticky_notes WHERE id = ?1", params![id])
                .map_err(|e| e.to_string())?;
            Ok(())
        })
    }
}
