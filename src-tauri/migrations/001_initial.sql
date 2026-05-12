-- Initial schema for JJtool
-- This file is for reference; actual migrations run in db/migrations.rs

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
