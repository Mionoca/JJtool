use rusqlite::{params, Connection};

use super::connection::Database;
use crate::models::study::{CreateStudyPlan, CreateStudyTask, StudyPlan, StudyTask};

fn insert_reminder_for_study_task(
    conn: &Connection,
    task_id: i64,
    task: &CreateStudyTask,
) -> Result<Option<i64>, String> {
    if !task.reminder_enabled {
        return Ok(None);
    }

    let Some(trigger_at) = task.reminder_at.as_deref() else {
        return Ok(None);
    };

    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO reminders
         (title, description, trigger_at, is_recurring, recurrence, category, source_id, priority, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'study', ?6, ?7, ?8)",
        params![
            format!("学习计划：{}", task.title),
            task.notes.as_deref(),
            trigger_at,
            task.is_recurring as i32,
            task.recurrence.as_deref(),
            task_id,
            task.priority,
            now,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Some(conn.last_insert_rowid()))
}

impl Database {
    pub fn create_study_plan(&self, plan: &CreateStudyPlan) -> Result<StudyPlan, String> {
        self.with_conn(|conn| {
            conn.execute(
                "INSERT INTO study_plans (title, description, plan_date, plan_type) VALUES (?1, ?2, ?3, ?4)",
                params![
                    plan.title,
                    plan.description,
                    plan.plan_date,
                    plan.plan_type.as_deref().unwrap_or("daily"),
                ],
            )
            .map_err(|e| e.to_string())?;

            let id = conn.last_insert_rowid();
            Ok(StudyPlan {
                id,
                title: plan.title.clone(),
                description: plan.description.clone(),
                plan_date: plan.plan_date.clone(),
                plan_type: plan.plan_type.clone().unwrap_or_else(|| "daily".to_string()),
                is_completed: false,
                created_at: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
                tasks: Vec::new(),
            })
        })
    }

    pub fn get_study_plans(&self, date: Option<&str>) -> Result<Vec<StudyPlan>, String> {
        self.with_conn(|conn| {
            let query = if date.is_some() {
                "SELECT id, title, description, plan_date, plan_type, is_completed, created_at FROM study_plans WHERE plan_date = ?1 ORDER BY created_at DESC"
            } else {
                "SELECT id, title, description, plan_date, plan_type, is_completed, created_at FROM study_plans ORDER BY plan_date DESC, created_at DESC LIMIT 30"
            };

            let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;

            let plans: Vec<StudyPlan> = if let Some(d) = date {
                stmt.query_map(params![d], |row| {
                    Ok(StudyPlan {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        description: row.get(2)?,
                        plan_date: row.get(3)?,
                        plan_type: row.get(4)?,
                        is_completed: row.get::<_, i32>(5)? != 0,
                        created_at: row.get(6)?,
                        tasks: Vec::new(),
                    })
                })
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?
            } else {
                stmt.query_map([], |row| {
                    Ok(StudyPlan {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        description: row.get(2)?,
                        plan_date: row.get(3)?,
                        plan_type: row.get(4)?,
                        is_completed: row.get::<_, i32>(5)? != 0,
                        created_at: row.get(6)?,
                        tasks: Vec::new(),
                    })
                })
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?
            };

            let mut plans_with_tasks = Vec::new();
            for mut plan in plans {
                let mut task_stmt = conn
                    .prepare(
                        "SELECT id, plan_id, title, notes, duration_min, reminder_at,
                         reminder_enabled, is_recurring, recurrence, priority, reminder_id,
                         is_done, sort_order
                         FROM study_tasks WHERE plan_id = ?1 ORDER BY sort_order",
                    )
                    .map_err(|e| e.to_string())?;

                plan.tasks = task_stmt
                    .query_map(params![plan.id], |row| {
                        Ok(StudyTask {
                            id: row.get(0)?,
                            plan_id: row.get(1)?,
                            title: row.get(2)?,
                            notes: row.get(3)?,
                            duration_min: row.get(4)?,
                            reminder_at: row.get(5)?,
                            reminder_enabled: row.get::<_, i32>(6)? != 0,
                            is_recurring: row.get::<_, i32>(7)? != 0,
                            recurrence: row.get(8)?,
                            priority: row.get(9)?,
                            reminder_id: row.get(10)?,
                            is_done: row.get::<_, i32>(11)? != 0,
                            sort_order: row.get(12)?,
                        })
                    })
                    .map_err(|e| e.to_string())?
                    .collect::<Result<Vec<_>, _>>()
                    .map_err(|e| e.to_string())?;

                plans_with_tasks.push(plan);
            }

            Ok(plans_with_tasks)
        })
    }

    pub fn add_study_task(&self, task: &CreateStudyTask) -> Result<StudyTask, String> {
        self.with_conn(|conn| {
            let max_order: i32 = conn
                .query_row(
                    "SELECT COALESCE(MAX(sort_order), 0) FROM study_tasks WHERE plan_id = ?1",
                    params![task.plan_id],
                    |row| row.get(0),
                )
                .map_err(|e| e.to_string())?;

            conn.execute(
                "INSERT INTO study_tasks
                 (plan_id, title, notes, duration_min, reminder_at, reminder_enabled,
                  is_recurring, recurrence, priority, sort_order)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    task.plan_id,
                    task.title.as_str(),
                    task.notes.as_deref(),
                    task.duration_min,
                    task.reminder_at.as_deref(),
                    task.reminder_enabled as i32,
                    task.is_recurring as i32,
                    task.recurrence.as_deref(),
                    task.priority,
                    max_order + 1,
                ],
            )
            .map_err(|e| e.to_string())?;

            let id = conn.last_insert_rowid();
            let reminder_id = insert_reminder_for_study_task(conn, id, task)?;
            if let Some(reminder_id) = reminder_id {
                conn.execute(
                    "UPDATE study_tasks SET reminder_id = ?1 WHERE id = ?2",
                    params![reminder_id, id],
                )
                .map_err(|e| e.to_string())?;
            }

            Ok(StudyTask {
                id,
                plan_id: task.plan_id,
                title: task.title.clone(),
                notes: task.notes.clone(),
                duration_min: task.duration_min,
                reminder_at: task.reminder_at.clone(),
                reminder_enabled: task.reminder_enabled,
                is_recurring: task.is_recurring,
                recurrence: task.recurrence.clone(),
                priority: task.priority,
                reminder_id,
                is_done: false,
                sort_order: max_order + 1,
            })
        })
    }

    pub fn toggle_study_task(&self, id: i64) -> Result<bool, String> {
        self.with_conn(|conn| {
            conn.execute(
                "UPDATE study_tasks SET is_done = CASE WHEN is_done = 0 THEN 1 ELSE 0 END WHERE id = ?1",
                params![id],
            )
            .map_err(|e| e.to_string())?;

            let (is_done, reminder_id): (bool, Option<i64>) = conn
                .query_row(
                    "SELECT is_done, reminder_id FROM study_tasks WHERE id = ?1",
                    params![id],
                    |row| Ok((row.get::<_, i32>(0)? != 0, row.get(1)?)),
                )
                .map_err(|e| e.to_string())?;

            if let Some(reminder_id) = reminder_id {
                conn.execute(
                    "UPDATE reminders SET is_completed = ?1 WHERE id = ?2",
                    params![is_done as i32, reminder_id],
                )
                .map_err(|e| e.to_string())?;
            }

            Ok(is_done)
        })
    }

    pub fn delete_study_task(&self, id: i64) -> Result<(), String> {
        self.with_conn(|conn| {
            let reminder_id: Option<i64> = conn
                .query_row(
                    "SELECT reminder_id FROM study_tasks WHERE id = ?1",
                    params![id],
                    |row| row.get(0),
                )
                .unwrap_or(None);

            if let Some(reminder_id) = reminder_id {
                conn.execute("DELETE FROM reminders WHERE id = ?1", params![reminder_id])
                    .map_err(|e| e.to_string())?;
            }

            conn.execute("DELETE FROM study_tasks WHERE id = ?1", params![id])
                .map_err(|e| e.to_string())?;
            Ok(())
        })
    }

    pub fn delete_study_plan(&self, id: i64) -> Result<(), String> {
        self.with_conn(|conn| {
            let mut stmt = conn
                .prepare("SELECT reminder_id FROM study_tasks WHERE plan_id = ?1 AND reminder_id IS NOT NULL")
                .map_err(|e| e.to_string())?;
            let reminder_ids = stmt
                .query_map(params![id], |row| row.get::<_, i64>(0))
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;

            for reminder_id in reminder_ids {
                conn.execute("DELETE FROM reminders WHERE id = ?1", params![reminder_id])
                    .map_err(|e| e.to_string())?;
            }

            conn.execute("DELETE FROM study_tasks WHERE plan_id = ?1", params![id])
                .map_err(|e| e.to_string())?;
            conn.execute("DELETE FROM study_plans WHERE id = ?1", params![id])
                .map_err(|e| e.to_string())?;
            Ok(())
        })
    }
}
