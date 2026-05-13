use std::collections::HashMap;
use std::sync::Arc;
use tauri::{Manager, State};
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

#[tauri::command]
pub fn save_character_image(
    app_handle: tauri::AppHandle,
    mood: String,
    image_data: String,
) -> Result<String, String> {
    use std::fs;

    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let chars_dir = app_data_dir.join("characters");
    fs::create_dir_all(&chars_dir).map_err(|e| e.to_string())?;

    // Decode base64
    use base64::Engine;
    let engine = base64::engine::general_purpose::STANDARD;

    // Remove data URL prefix if present
    let raw_data = if let Some(pos) = image_data.find(",") {
        &image_data[pos + 1..]
    } else {
        &image_data
    };

    let bytes = engine.decode(raw_data).map_err(|e| format!("Base64 decode error: {}", e))?;

    let filename = format!("{}.png", mood);
    let filepath = chars_dir.join(&filename);
    fs::write(&filepath, &bytes).map_err(|e| e.to_string())?;

    // Store path in settings
    let relative_path = format!("characters/{}", filename);
    Ok(relative_path)
}

#[tauri::command]
pub fn get_character_images(app_handle: tauri::AppHandle) -> Result<HashMap<String, String>, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let chars_dir = app_data_dir.join("characters");
    let mut result = HashMap::new();

    if chars_dir.exists() {
        for mood in &["normal", "happy", "angry", "sleepy", "working"] {
            let filepath = chars_dir.join(format!("{}.png", mood));
            if filepath.exists() {
                result.insert(mood.to_string(), filepath.to_string_lossy().to_string());
            }
        }
    }

    Ok(result)
}

#[tauri::command]
pub fn delete_character_image(
    app_handle: tauri::AppHandle,
    mood: String,
) -> Result<(), String> {
    use std::fs;

    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let filepath = app_data_dir.join("characters").join(format!("{}.png", mood));
    if filepath.exists() {
        fs::remove_file(filepath).map_err(|e| e.to_string())?;
    }
    Ok(())
}
