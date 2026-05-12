use std::sync::Arc;
use tauri::State;
use crate::db::Database;
use crate::models::reminder::{CreateReminder, Reminder};
use crate::utils::nlp_time;

#[tauri::command]
pub fn create_reminder(
    db: State<'_, Arc<Database>>,
    title: String,
    description: Option<String>,
    trigger_at: String,
    is_recurring: Option<bool>,
    recurrence: Option<String>,
) -> Result<Reminder, String> {
    let item = CreateReminder {
        title,
        description,
        trigger_at,
        is_recurring: is_recurring.unwrap_or(false),
        recurrence,
    };
    db.insert_reminder(&item)
}

#[tauri::command]
pub fn get_pending_reminders(db: State<'_, Arc<Database>>) -> Result<Vec<Reminder>, String> {
    db.get_pending_reminders()
}

#[tauri::command]
pub fn get_all_reminders(db: State<'_, Arc<Database>>) -> Result<Vec<Reminder>, String> {
    db.get_all_reminders()
}

#[tauri::command]
pub fn complete_reminder(db: State<'_, Arc<Database>>, id: i64) -> Result<(), String> {
    db.complete_reminder(id)
}

#[tauri::command]
pub fn snooze_reminder(db: State<'_, Arc<Database>>, id: i64, minutes: i64) -> Result<(), String> {
    db.snooze_reminder(id, minutes)
}

#[tauri::command]
pub fn dismiss_reminder(db: State<'_, Arc<Database>>, id: i64) -> Result<(), String> {
    db.dismiss_reminder(id)
}

#[tauri::command]
pub fn delete_reminder(db: State<'_, Arc<Database>>, id: i64) -> Result<(), String> {
    db.delete_reminder(id)
}

/// Parse a natural language time string into a datetime.
/// Returns ISO datetime string or null if parsing fails.
#[tauri::command]
pub fn parse_reminder_time(input: String) -> Option<String> {
    nlp_time::parse_natural_time(&input)
}
