use rusqlite::Connection;

pub fn run_migrations(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS clipboard_history (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            content     TEXT NOT NULL,
            content_type TEXT NOT NULL DEFAULT 'text',
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
            duration_min INTEGER,
            is_done      INTEGER NOT NULL DEFAULT 0,
            sort_order   INTEGER NOT NULL DEFAULT 0
        );
        ",
    )
    .map_err(|e| format!("Migration execution failed: {}", e))?;

    Ok(())
}
