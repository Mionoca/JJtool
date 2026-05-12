use std::sync::Arc;
use tauri::Emitter;

use crate::db::Database;

/// Health monitor that tracks user activity and reminds them to take breaks.
/// Uses GetLastInputInfo to detect idle periods.
pub fn start_health_monitor(app_handle: tauri::AppHandle, db: Arc<Database>) {
    std::thread::spawn(move || {
        let mut last_active_time = std::time::Instant::now();
        let mut last_idle_check = std::time::Instant::now();

        loop {
            std::thread::sleep(std::time::Duration::from_secs(10));

            // Get configured interval (default 40 min)
            let interval_min = db
                .get_setting("health_interval_min")
                .ok()
                .flatten()
                .and_then(|v| v.parse::<u64>().ok())
                .unwrap_or(40);

            let idle_ms = get_idle_time_ms();
            let is_idle = idle_ms > 300_000; // 5 min idle = user is away

            if is_idle {
                // User is idle, reset timer
                last_active_time = std::time::Instant::now();
            } else {
                // User is active
                let active_duration = last_active_time.elapsed();
                let interval_duration = std::time::Duration::from_secs(interval_min * 60);

                if active_duration >= interval_duration
                    && last_idle_check.elapsed() >= std::time::Duration::from_secs(60)
                {
                    last_idle_check = std::time::Instant::now();
                    last_active_time = std::time::Instant::now();

                    let _ = app_handle.emit(
                        "health-reminder",
                        serde_json::json!({
                            "type": "sedentary",
                            "message": format!("主人已经连续工作{}分钟啦，记得站起来活动一下，喝杯水休息一下～ (◕‿◕✿)", interval_min),
                        }),
                    );
                }
            }
        }
    });
}

/// Get the idle time in milliseconds using Windows GetLastInputInfo.
#[cfg(windows)]
fn get_idle_time_ms() -> u64 {
    use windows::Win32::System::SystemInformation::GetTickCount;
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};

    unsafe {
        let mut lii = LASTINPUTINFO {
            cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
            dwTime: 0,
        };

        if GetLastInputInfo(&mut lii).as_bool() {
            let tick_count = GetTickCount();
            if tick_count >= lii.dwTime {
                return (tick_count - lii.dwTime) as u64;
            }
        }
    }
    0
}

#[cfg(not(windows))]
fn get_idle_time_ms() -> u64 {
    0
}
