use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    pub settings: HashMap<String, String>,
}

impl Default for UserSettings {
    fn default() -> Self {
        let mut settings = HashMap::new();
        settings.insert("character".to_string(), "default".to_string());
        settings.insert("auto_start".to_string(), "true".to_string());
        settings.insert("pet_position_x".to_string(), "1200".to_string());
        settings.insert("pet_position_y".to_string(), "600".to_string());
        settings.insert("clipboard_hotkey".to_string(), "Ctrl+Shift+V".to_string());
        settings.insert("health_interval_min".to_string(), "40".to_string());
        settings.insert("news_keywords".to_string(), "".to_string());
        settings.insert(
            "interests".to_string(),
            r#"["人工智能","深度学习","编程","科技"]"#.to_string(),
        );
        Self { settings }
    }
}
