use chrono::Timelike;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PetState {
    pub mood: String,
    pub message: String,
}

#[tauri::command]
pub fn get_pet_greeting() -> Result<PetState, String> {
    let hour = chrono::Local::now().hour();
    let (mood, message) = match hour {
        6..=11 => (
            "happy",
            "主人早上好呀～今天也要加油哦！(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧",
        ),
        12..=13 => (
            "happy",
            "主人中午好～记得吃饭哦！(◕‿◕✿)",
        ),
        14..=17 => (
            "working",
            "主人下午好～工作辛苦啦，要不要休息一下？",
        ),
        18..=22 => (
            "happy",
            "主人晚上好～今天过得怎么样呀？",
        ),
        _ => (
            "sleepy",
            "主人该睡觉啦～明天也要元气满满哦！(´-ω-`)",
        ),
    };
    Ok(PetState {
        mood: mood.to_string(),
        message: message.to_string(),
    })
}

#[tauri::command]
pub fn quit_app(app: tauri::AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}
