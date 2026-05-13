use rusqlite::Connection;

pub fn run_migrations(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS clipboard_history (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            content     TEXT NOT NULL,
            content_type TEXT NOT NULL DEFAULT 'text',
            preview     TEXT,
            mime_type   TEXT,
            image_data  TEXT,
            source_app  TEXT,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            is_pinned   INTEGER NOT NULL DEFAULT 0,
            tags        TEXT DEFAULT '[]',
            created_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            expires_at  TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_clipboard_created ON clipboard_history(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_clipboard_type ON clipboard_history(content_type);

        CREATE TABLE IF NOT EXISTS reminders (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            title        TEXT NOT NULL,
            description  TEXT,
            trigger_at   TEXT NOT NULL,
            is_recurring INTEGER NOT NULL DEFAULT 0,
            recurrence   TEXT,
            is_completed INTEGER NOT NULL DEFAULT 0,
            is_dismissed INTEGER NOT NULL DEFAULT 0,
            snooze_until TEXT,
            category     TEXT NOT NULL DEFAULT 'normal',
            source_id    INTEGER,
            priority     INTEGER NOT NULL DEFAULT 1,
            created_at   TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );

        CREATE INDEX IF NOT EXISTS idx_reminders_trigger ON reminders(trigger_at) WHERE is_completed = 0;

        CREATE TABLE IF NOT EXISTS user_settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS news_articles (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            summary     TEXT,
            url         TEXT NOT NULL UNIQUE,
            source      TEXT,
            category    TEXT,
            fetched_at  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            is_read     INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_news_fetched ON news_articles(fetched_at DESC);

        CREATE TABLE IF NOT EXISTS study_plans (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            title        TEXT NOT NULL,
            description  TEXT,
            plan_date    TEXT NOT NULL,
            plan_type    TEXT NOT NULL DEFAULT 'daily',
            is_completed INTEGER NOT NULL DEFAULT 0,
            created_at   TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS study_tasks (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_id      INTEGER NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
            title        TEXT NOT NULL,
            notes        TEXT,
            duration_min INTEGER,
            reminder_at  TEXT,
            reminder_enabled INTEGER NOT NULL DEFAULT 0,
            is_recurring INTEGER NOT NULL DEFAULT 0,
            recurrence   TEXT,
            priority     INTEGER NOT NULL DEFAULT 1,
            reminder_id  INTEGER REFERENCES reminders(id) ON DELETE SET NULL,
            is_done      INTEGER NOT NULL DEFAULT 0,
            sort_order   INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sticky_notes (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            title        TEXT,
            content      TEXT NOT NULL DEFAULT '',
            content_type TEXT NOT NULL DEFAULT 'markdown',
            color        TEXT NOT NULL DEFAULT '#FFFBEB',
            priority     INTEGER NOT NULL DEFAULT 0,
            is_pinned    INTEGER NOT NULL DEFAULT 0,
            sort_order   INTEGER NOT NULL DEFAULT 0,
            is_archived  INTEGER NOT NULL DEFAULT 0,
            created_at   TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            updated_at   TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );

        CREATE INDEX IF NOT EXISTS idx_sticky_sort ON sticky_notes(sort_order) WHERE is_archived = 0;

        CREATE TABLE IF NOT EXISTS todo_items (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            note_id    INTEGER NOT NULL REFERENCES sticky_notes(id) ON DELETE CASCADE,
            text       TEXT NOT NULL,
            is_done    INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );
        ",
    )
    .map_err(|e| format!("Migration execution failed: {}", e))?;

    add_column_if_missing(conn, "clipboard_history", "preview", "TEXT")?;
    add_column_if_missing(conn, "clipboard_history", "mime_type", "TEXT")?;
    add_column_if_missing(conn, "reminders", "category", "TEXT NOT NULL DEFAULT 'normal'")?;
    add_column_if_missing(conn, "reminders", "source_id", "INTEGER")?;
    add_column_if_missing(conn, "reminders", "priority", "INTEGER NOT NULL DEFAULT 1")?;
    add_column_if_missing(conn, "study_tasks", "notes", "TEXT")?;
    add_column_if_missing(conn, "study_tasks", "reminder_at", "TEXT")?;
    add_column_if_missing(
        conn,
        "study_tasks",
        "reminder_enabled",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    add_column_if_missing(
        conn,
        "study_tasks",
        "is_recurring",
        "INTEGER NOT NULL DEFAULT 0",
    )?;
    add_column_if_missing(conn, "study_tasks", "recurrence", "TEXT")?;
    add_column_if_missing(conn, "study_tasks", "priority", "INTEGER NOT NULL DEFAULT 1")?;
    add_column_if_missing(conn, "study_tasks", "reminder_id", "INTEGER")?;

    Ok(())
}

fn add_column_if_missing(
    conn: &Connection,
    table: &str,
    column: &str,
    definition: &str,
) -> Result<(), String> {
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({})", table))
        .map_err(|e| e.to_string())?;
    let columns = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    if columns.iter().any(|existing| existing == column) {
        return Ok(());
    }

    conn.execute(
        &format!("ALTER TABLE {} ADD COLUMN {} {}", table, column, definition),
        [],
    )
    .map_err(|e| format!("Failed to add column {}.{}: {}", table, column, e))?;

    Ok(())
}
