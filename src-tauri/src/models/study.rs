use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudyPlan {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub plan_date: String,
    pub plan_type: String,
    pub is_completed: bool,
    pub created_at: String,
    pub tasks: Vec<StudyTask>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudyTask {
    pub id: i64,
    pub plan_id: i64,
    pub title: String,
    pub notes: Option<String>,
    pub duration_min: Option<i32>,
    pub reminder_at: Option<String>,
    pub reminder_enabled: bool,
    pub is_recurring: bool,
    pub recurrence: Option<String>,
    pub priority: i32,
    pub reminder_id: Option<i64>,
    pub is_done: bool,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateStudyPlan {
    pub title: String,
    pub description: Option<String>,
    pub plan_date: String,
    pub plan_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateStudyTask {
    pub plan_id: i64,
    pub title: String,
    pub notes: Option<String>,
    pub duration_min: Option<i32>,
    pub reminder_at: Option<String>,
    pub reminder_enabled: bool,
    pub is_recurring: bool,
    pub recurrence: Option<String>,
    pub priority: i32,
}
