pub mod commands;
pub mod db;
pub mod models;
pub mod services;
pub mod utils;

use std::sync::Arc;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Resolve data directory
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data dir");

            // Initialize database
            let database =
                db::Database::new(&app_data_dir).expect("Failed to initialize database");
            let db = Arc::new(database);

            // Start clipboard monitor
            let app_handle = app.handle().clone();
            services::start_clipboard_monitor(app_handle, db.clone());

            // Start health monitor
            let app_handle_health = app.handle().clone();
            services::start_health_monitor(app_handle_health, db.clone());

            // Store database in app state
            app.manage(db);

            // Setup system tray menu
            let show_item = MenuItem::with_id(app, "show", "显示桌宠", true, None::<&str>)?;
            let clipboard_item =
                MenuItem::with_id(app, "clipboard", "剪贴板历史", true, None::<&str>)?;
            let settings_item = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[&show_item, &clipboard_item, &settings_item, &quit_item],
            )?;

            // Build tray icon
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("JJtool - AI 桌面助手")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "clipboard" => {
                        if let Some(window) = app.get_webview_window("clipboard") {
                            let visible = window.is_visible().unwrap_or(false);
                            if visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    "settings" => {
                        if let Some(window) = app.get_webview_window("settings") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // Cleanup expired clipboard entries on startup
            let app_handle2 = app.handle().clone();
            std::thread::spawn(move || {
                let db = app_handle2.state::<Arc<db::Database>>();
                if let Err(e) = db.cleanup_expired() {
                    eprintln!("Cleanup error: {}", e);
                }
            });

            // Start reminder scheduler - checks every 30s
            let app_handle3 = app.handle().clone();
            std::thread::spawn(move || {
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(30));
                    let db = app_handle3.state::<Arc<db::Database>>();
                    match db.get_due_reminders() {
                        Ok(reminders) => {
                            for reminder in reminders {
                                let _ = app_handle3.emit("reminder-triggered", &reminder);
                            }
                        }
                        Err(e) => eprintln!("Reminder check error: {}", e),
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::clipboard::get_clipboard_history,
            commands::clipboard::insert_clipboard_item,
            commands::clipboard::delete_clipboard_item,
            commands::clipboard::toggle_clipboard_favorite,
            commands::clipboard::clear_clipboard_history,
            commands::clipboard::copy_to_clipboard,
            commands::reminder::create_reminder,
            commands::reminder::get_pending_reminders,
            commands::reminder::get_all_reminders,
            commands::reminder::complete_reminder,
            commands::reminder::snooze_reminder,
            commands::reminder::dismiss_reminder,
            commands::reminder::delete_reminder,
            commands::reminder::parse_reminder_time,
            commands::settings::get_settings,
            commands::settings::set_setting,
            commands::settings::get_setting,
            commands::sticky::create_sticky_note,
            commands::sticky::get_sticky_notes,
            commands::sticky::update_sticky_note,
            commands::sticky::delete_sticky_note,
            commands::pet::get_pet_greeting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running JJtool");
}
