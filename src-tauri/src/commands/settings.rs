use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;
use crate::db::Database;

#[tauri::command]
pub fn get_settings(db: State<'_, Arc<Database>>) -> Result<HashMap<String, String>, String> {
    let settings = db.get_settings()?;
    Ok(settings.settings)
}

#[tauri::command]
pub fn set_setting(db: State<'_, Arc<Database>>, key: String, value: String) -> Result<(), String> {
    db.set_setting(&key, &value)
}

#[tauri::command]
pub fn get_setting(db: State<'_, Arc<Database>>, key: String) -> Result<Option<String>, String> {
    db.get_setting(&key)
}
