use std::sync::Arc;
use tauri::State;
use crate::db::Database;
use crate::models::sticky::{CreateStickyNote, StickyNote, UpdateStickyNote};

#[tauri::command]
pub fn create_sticky_note(
    db: State<'_, Arc<Database>>,
    title: Option<String>,
    content: String,
    content_type: Option<String>,
    color: Option<String>,
    priority: Option<i32>,
) -> Result<StickyNote, String> {
    let item = CreateStickyNote {
        title,
        content,
        content_type,
        color,
        priority,
    };
    db.insert_sticky_note(&item)
}

#[tauri::command]
pub fn get_sticky_notes(db: State<'_, Arc<Database>>) -> Result<Vec<StickyNote>, String> {
    db.get_all_sticky_notes()
}

#[tauri::command]
pub fn update_sticky_note(
    db: State<'_, Arc<Database>>,
    id: i64,
    title: Option<String>,
    content: Option<String>,
    color: Option<String>,
    priority: Option<i32>,
    is_pinned: Option<bool>,
    sort_order: Option<i32>,
) -> Result<(), String> {
    let update = UpdateStickyNote {
        title,
        content,
        color,
        priority,
        is_pinned,
        sort_order,
    };
    db.update_sticky_note(id, &update)
}

#[tauri::command]
pub fn delete_sticky_note(db: State<'_, Arc<Database>>, id: i64) -> Result<(), String> {
    db.delete_sticky_note(id)
}
