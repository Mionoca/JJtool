use rusqlite::params;
use super::connection::Database;
use crate::models::settings::UserSettings;

impl Database {
    pub fn get_settings(&self) -> Result<UserSettings, String> {
        self.with_conn(|conn| {
            let mut stmt = conn
                .prepare("SELECT key, value FROM user_settings")
                .map_err(|e| e.to_string())?;

            let rows = stmt
                .query_map([], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                })
                .map_err(|e| e.to_string())?;

            let mut settings = std::collections::HashMap::new();
            for row in rows {
                let (k, v) = row.map_err(|e| e.to_string())?;
                settings.insert(k, v);
            }

            // Merge with defaults
            let defaults = UserSettings::default();
            for (k, v) in defaults.settings {
                settings.entry(k).or_insert(v);
            }

            Ok(UserSettings { settings })
        })
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        self.with_conn(|conn| {
            conn.execute(
                "INSERT OR REPLACE INTO user_settings (key, value) VALUES (?1, ?2)",
                params![key, value],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        })
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        self.with_conn(|conn| {
            let result = conn.query_row(
                "SELECT value FROM user_settings WHERE key = ?1",
                params![key],
                |row| row.get::<_, String>(0),
            );
            match result {
                Ok(v) => Ok(Some(v)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(e.to_string()),
            }
        })
    }
}
