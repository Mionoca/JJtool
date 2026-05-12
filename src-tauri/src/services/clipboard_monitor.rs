use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use crate::db::Database;
use crate::models::clipboard::CreateClipboardItem;

/// Start the clipboard monitoring background thread.
/// Polls clipboard every 500ms and emits events on change.
pub fn start_clipboard_monitor(app: AppHandle, db: Arc<Database>) {
    thread::spawn(move || {
        let mut last_content = String::new();

        loop {
            thread::sleep(Duration::from_millis(500));

            let current = read_clipboard_text();

            if let Some(text) = current {
                if !text.is_empty() && text != last_content {
                    last_content = text.clone();

                    let item = CreateClipboardItem {
                        content: text,
                        content_type: "text".to_string(),
                        image_data: None,
                        source_app: None,
                    };

                    match db.insert_clipboard(&item) {
                        Ok(saved) => {
                            let _ = app.emit("clipboard-changed", &saved);
                        }
                        Err(ref e) if e == "Duplicate" => {
                            // Skip duplicates silently
                        }
                        Err(e) => {
                            eprintln!("Clipboard save error: {}", e);
                        }
                    }
                }
            }
        }
    });
}

/// Read text content from the Windows clipboard using Win32 API.
fn read_clipboard_text() -> Option<String> {
    use std::ptr;

    // Open clipboard
    let success = unsafe { OpenClipboard(ptr::null_mut()) };
    if success == 0 {
        return None;
    }

    let result = (|| {
        // CF_TEXT = 1, CF_UNICODETEXT = 13
        let handle = unsafe { GetClipboardData(13) }; // CF_UNICODETEXT
        if handle.is_null() {
            return None;
        }

        let ptr = unsafe { GlobalLock(handle as _) };
        if ptr.is_null() {
            return None;
        }

        // Read UTF-16 string
        let mut len = 0;
        let mut p = ptr as *const u16;
        loop {
            if unsafe { *p } == 0 {
                break;
            }
            len += 1;
            p = unsafe { p.add(1) };
        }

        let slice = unsafe { std::slice::from_raw_parts(ptr as *const u16, len) };
        let text = String::from_utf16_lossy(slice);

        unsafe { GlobalUnlock(handle as _) };

        Some(text)
    })();

    unsafe { CloseClipboard() };
    result
}

// Win32 API bindings
#[link(name = "user32")]
extern "system" {
    fn OpenClipboard(hWnd: *mut core::ffi::c_void) -> i32;
    fn CloseClipboard() -> i32;
    fn GetClipboardData(uFormat: u32) -> *mut core::ffi::c_void;
}

#[link(name = "kernel32")]
extern "system" {
    fn GlobalLock(hMem: *mut core::ffi::c_void) -> *mut core::ffi::c_void;
    fn GlobalUnlock(hMem: *mut core::ffi::c_void) -> i32;
}
