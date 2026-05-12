use rusqlite::params;
use super::connection::Database;
use crate::models::reminder::{CreateReminder, Reminder};

impl Database {
    pub fn insert_reminder(&self, item: &CreateReminder) -> Result<Reminder, String> {
        self.with_conn(|conn| {
            let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
            conn.execute(
                "INSERT INTO reminders (title, description, trigger_at, is_recurring, recurrence, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    item.title,
                    item.description,
                    item.trigger_at,
                    item.is_recurring as i32,
                    item.recurrence,
                    now,
                ],
            )
            .map_err(|e| e.to_string())?;

            let id = conn.last_insert_rowid();
            Ok(Reminder {
                id,
                title: item.title.clone(),
                description: item.description.clone(),
                trigger_at: item.trigger_at.clone(),
                is_recurring: item.is_recurring,
                recurrence: item.recurrence.clone(),
                is_completed: false,
                is_dismissed: false,
                snooze_until: None,
                created_at: now,
            })
        })
    }

    pub fn get_pending_reminders(&self) -> Result<Vec<Reminder>, String> {
        self.with_conn(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, title, description, trigger_at, is_recurring, recurrence,
                     is_completed, is_dismissed, snooze_until, created_at
                     FROM reminders
                     WHERE is_completed = 0 AND is_dismissed = 0
                     AND (snooze_until IS NULL OR snooze_until <= datetime('now', 'localtime'))
                     AND trigger_at <= datetime('now', 'localtime')
                     ORDER BY trigger_at ASC",
                )
                .map_err(|e| e.to_string())?;

            let rows = stmt
                .query_map([], |row| {
                    Ok(Reminder {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        description: row.get(2)?,
                        trigger_at: row.get(3)?,
                        is_recurring: row.get::<_, i32>(4)? != 0,
                        recurrence: row.get(5)?,
                        is_completed: row.get::<_, i32>(6)? != 0,
                        is_dismissed: row.get::<_, i32>(7)? != 0,
                        snooze_until: row.get(8)?,
                        created_at: row.get(9)?,
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

    pub fn complete_reminder(&self, id: i64) -> Result<(), String> {
        self.with_conn(|conn| {
            conn.execute(
                "UPDATE reminders SET is_completed = 1 WHERE id = ?1",
                params![id],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        })
    }

    pub fn snooze_reminder(&self, id: i64, minutes: i64) -> Result<(), String> {
        self.with_conn(|conn| {
            conn.execute(
                "UPDATE reminders SET snooze_until = datetime('now', 'localtime', ?1)
                 WHERE id = ?2",
                params![format!("+{} minutes", minutes), id],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        })
    }

    pub fn dismiss_reminder(&self, id: i64) -> Result<(), String> {
        self.with_conn(|conn| {
            conn.execute(
                "UPDATE reminders SET is_dismissed = 1 WHERE id = ?1",
                params![id],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        })
    }

    pub fn get_all_reminders(&self) -> Result<Vec<Reminder>, String> {
        self.with_conn(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, title, description, trigger_at, is_recurring, recurrence,
                     is_completed, is_dismissed, snooze_until, created_at
                     FROM reminders ORDER BY trigger_at DESC",
                )
                .map_err(|e| e.to_string())?;

            let rows = stmt
                .query_map([], |row| {
                    Ok(Reminder {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        description: row.get(2)?,
                        trigger_at: row.get(3)?,
                        is_recurring: row.get::<_, i32>(4)? != 0,
                        recurrence: row.get(5)?,
                        is_completed: row.get::<_, i32>(6)? != 0,
                        is_dismissed: row.get::<_, i32>(7)? != 0,
                        snooze_until: row.get(8)?,
                        created_at: row.get(9)?,
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

    pub fn delete_reminder(&self, id: i64) -> Result<(), String> {
        self.with_conn(|conn| {
            conn.execute("DELETE FROM reminders WHERE id = ?1", params![id])
                .map_err(|e| e.to_string())?;
            Ok(())
        })
    }

    /// Get reminders that are due now (trigger_at <= now, not completed, not dismissed).
    /// Also handles snoozed reminders whose snooze_until has passed.
    pub fn get_due_reminders(&self) -> Result<Vec<Reminder>, String> {
        self.with_conn(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, title, description, trigger_at, is_recurring, recurrence,
                     is_completed, is_dismissed, snooze_until, created_at
                     FROM reminders
                     WHERE is_completed = 0 AND is_dismissed = 0
                     AND (
                         (snooze_until IS NULL AND trigger_at <= datetime('now', 'localtime'))
                         OR (snooze_until IS NOT NULL AND snooze_until <= datetime('now', 'localtime'))
                     )
                     ORDER BY trigger_at ASC",
                )
                .map_err(|e| e.to_string())?;

            let rows = stmt
                .query_map([], |row| {
                    Ok(Reminder {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        description: row.get(2)?,
                        trigger_at: row.get(3)?,
                        is_recurring: row.get::<_, i32>(4)? != 0,
                        recurrence: row.get(5)?,
                        is_completed: row.get::<_, i32>(6)? != 0,
                        is_dismissed: row.get::<_, i32>(7)? != 0,
                        snooze_until: row.get(8)?,
                        created_at: row.get(9)?,
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
}
