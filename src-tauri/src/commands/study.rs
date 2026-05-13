use std::sync::Arc;
use tauri::State;
use crate::db::Database;
use crate::models::study::{CreateStudyPlan, CreateStudyTask, StudyPlan, StudyTask};

#[tauri::command]
pub fn create_study_plan(
    db: State<'_, Arc<Database>>,
    title: String,
    description: Option<String>,
    plan_date: String,
    plan_type: Option<String>,
) -> Result<StudyPlan, String> {
    let plan = CreateStudyPlan {
        title,
        description,
        plan_date,
        plan_type,
    };
    db.create_study_plan(&plan)
}

#[tauri::command]
pub fn get_study_plans(db: State<'_, Arc<Database>>, date: Option<String>) -> Result<Vec<StudyPlan>, String> {
    db.get_study_plans(date.as_deref())
}

#[tauri::command]
pub fn add_study_task(
    db: State<'_, Arc<Database>>,
    plan_id: i64,
    title: String,
    duration_min: Option<i32>,
) -> Result<StudyTask, String> {
    let task = CreateStudyTask {
        plan_id,
        title,
        duration_min,
    };
    db.add_study_task(&task)
}

#[tauri::command]
pub fn toggle_study_task(db: State<'_, Arc<Database>>, id: i64) -> Result<bool, String> {
    db.toggle_study_task(id)
}

#[tauri::command]
pub fn delete_study_task(db: State<'_, Arc<Database>>, id: i64) -> Result<(), String> {
    db.delete_study_task(id)
}

#[tauri::command]
pub fn delete_study_plan(db: State<'_, Arc<Database>>, id: i64) -> Result<(), String> {
    db.delete_study_plan(id)
}
