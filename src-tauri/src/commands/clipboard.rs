use std::sync::Arc;
use tauri::State;
use crate::db::Database;
use crate::models::clipboard::{ClipboardFilter, CreateClipboardItem, ClipboardItem};

#[tauri::command]
pub fn get_clipboard_history(
    db: State<'_, Arc<Database>>,
    search: Option<String>,
    content_type: Option<String>,
    favorites_only: Option<bool>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<ClipboardItem>, String> {
    let filter = ClipboardFilter {
        search,
        content_type,
        favorites_only,
        limit,
        offset,
    };
    db.get_clipboard_history(&filter)
}

#[tauri::command]
pub fn insert_clipboard_item(
    db: State<'_, Arc<Database>>,
    content: String,
    content_type: Option<String>,
    preview: Option<String>,
    mime_type: Option<String>,
    image_data: Option<String>,
    source_app: Option<String>,
) -> Result<ClipboardItem, String> {
    let item = CreateClipboardItem {
        content,
        content_type: content_type.unwrap_or_else(|| "text".to_string()),
        preview,
        mime_type,
        image_data,
        source_app,
    };
    db.insert_clipboard(&item)
}

#[tauri::command]
pub fn delete_clipboard_item(db: State<'_, Arc<Database>>, id: i64) -> Result<(), String> {
    db.delete_clipboard(id)
}

#[tauri::command]
pub fn toggle_clipboard_favorite(db: State<'_, Arc<Database>>, id: i64) -> Result<bool, String> {
    db.toggle_favorite(id)
}

#[tauri::command]
pub fn clear_clipboard_history(db: State<'_, Arc<Database>>) -> Result<(), String> {
    db.clear_clipboard_history()
}

#[tauri::command]
pub fn copy_to_clipboard(_text: String) -> Result<(), String> {
    Ok(())
}
