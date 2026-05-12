use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reminder {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub trigger_at: String,
    pub is_recurring: bool,
    pub recurrence: Option<String>,
    pub is_completed: bool,
    pub is_dismissed: bool,
    pub snooze_until: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateReminder {
    pub title: String,
    pub description: Option<String>,
    pub trigger_at: String,
    pub is_recurring: bool,
    pub recurrence: Option<String>,
}
