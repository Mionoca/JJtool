use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::Path;
use std::sync::Arc;
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

use crate::db::Database;
use crate::models::clipboard::CreateClipboardItem;

const CF_UNICODETEXT: u32 = 13;
const CF_DIB: u32 = 8;
const CF_DIBV5: u32 = 17;
const CF_HDROP: u32 = 15;

struct ClipboardSnapshot {
    signature: String,
    item: CreateClipboardItem,
}

/// Start the clipboard monitoring background thread.
/// Polls clipboard every 500ms and emits events on change.
pub fn start_clipboard_monitor(app: AppHandle, db: Arc<Database>) {
    thread::spawn(move || {
        let mut last_signature = String::new();
        let asset_dir = app
            .path()
            .app_data_dir()
            .map(|dir| dir.join("clipboard-assets"))
            .unwrap_or_else(|_| std::env::temp_dir().join("jjtool-clipboard-assets"));

        loop {
            thread::sleep(Duration::from_millis(500));

            let Some(snapshot) = read_clipboard_snapshot(&asset_dir, &last_signature) else {
                continue;
            };

            last_signature = snapshot.signature;

            match db.insert_clipboard(&snapshot.item) {
                Ok(saved) => {
                    let _ = app.emit("clipboard-changed", &saved);
                }
                Err(ref e) if e == "Duplicate" => {
                    // Skip duplicates silently.
                }
                Err(e) => {
                    eprintln!("Clipboard save error: {}", e);
                }
            }
        }
    });
}

fn read_clipboard_snapshot(asset_dir: &Path, last_signature: &str) -> Option<ClipboardSnapshot> {
    let success = unsafe { OpenClipboard(std::ptr::null_mut()) };
    if success == 0 {
        return None;
    }

    let result = (|| {
        if let Some(files) = read_clipboard_files() {
            let content = serde_json::to_string(&files).ok()?;
            let signature = format!("file:{}", content);
            if signature == last_signature {
                return None;
            }

            let preview = files
                .iter()
                .take(3)
                .map(|path| {
                    Path::new(path)
                        .file_name()
                        .and_then(|name| name.to_str())
                        .unwrap_or(path)
                        .to_string()
                })
                .collect::<Vec<_>>()
                .join("、");

            return Some(ClipboardSnapshot {
                signature,
                item: CreateClipboardItem {
                    content,
                    content_type: "file".to_string(),
                    preview: Some(format!("{} 个文件：{}", files.len(), preview)),
                    mime_type: Some("application/json".to_string()),
                    image_data: None,
                    source_app: None,
                },
            });
        }

        if let Some((path, preview, mime_type, signature)) =
            read_clipboard_image(asset_dir, last_signature)
        {
            return Some(ClipboardSnapshot {
                signature,
                item: CreateClipboardItem {
                    content: path,
                    content_type: "image".to_string(),
                    preview: Some(preview.clone()),
                    mime_type: Some(mime_type),
                    image_data: Some(preview),
                    source_app: None,
                },
            });
        }

        if let Some(text) = read_clipboard_text() {
            if text.trim().is_empty() {
                return None;
            }

            let content_type = detect_content_type(&text);
            let signature = format!("{}:{}", content_type, text);
            if signature == last_signature {
                return None;
            }

            return Some(ClipboardSnapshot {
                signature,
                item: CreateClipboardItem {
                    preview: Some(text.chars().take(240).collect()),
                    mime_type: Some("text/plain".to_string()),
                    content: text,
                    content_type,
                    image_data: None,
                    source_app: None,
                },
            });
        }

        None
    })();

    unsafe {
        CloseClipboard();
    }
    result
}

fn read_clipboard_files() -> Option<Vec<String>> {
    if unsafe { IsClipboardFormatAvailable(CF_HDROP) } == 0 {
        return None;
    }

    let handle = unsafe { GetClipboardData(CF_HDROP) };
    if handle.is_null() {
        return None;
    }

    let count = unsafe { DragQueryFileW(handle, u32::MAX, std::ptr::null_mut(), 0) };
    if count == 0 {
        return None;
    }

    let mut files = Vec::new();
    for index in 0..count {
        let len = unsafe { DragQueryFileW(handle, index, std::ptr::null_mut(), 0) };
        if len == 0 {
            continue;
        }

        let mut buffer = vec![0u16; (len + 1) as usize];
        let copied = unsafe { DragQueryFileW(handle, index, buffer.as_mut_ptr(), len + 1) };
        if copied == 0 {
            continue;
        }
        files.push(String::from_utf16_lossy(&buffer[..copied as usize]));
    }

    if files.is_empty() {
        None
    } else {
        Some(files)
    }
}

fn read_clipboard_image(
    asset_dir: &Path,
    last_signature: &str,
) -> Option<(String, String, String, String)> {
    let format = if unsafe { IsClipboardFormatAvailable(CF_DIBV5) } != 0 {
        CF_DIBV5
    } else if unsafe { IsClipboardFormatAvailable(CF_DIB) } != 0 {
        CF_DIB
    } else {
        return None;
    };

    let handle = unsafe { GetClipboardData(format) };
    if handle.is_null() {
        return None;
    }

    let size = unsafe { GlobalSize(handle) };
    if size == 0 {
        return None;
    }

    let ptr = unsafe { GlobalLock(handle) };
    if ptr.is_null() {
        return None;
    }

    let dib = unsafe { std::slice::from_raw_parts(ptr as *const u8, size) };
    let signature = format!("image:{:x}:{}", hash_bytes(dib), size);
    if signature == last_signature {
        unsafe {
            GlobalUnlock(handle);
        }
        return None;
    }

    let bmp = dib_to_bmp_bytes(dib);
    unsafe {
        GlobalUnlock(handle);
    }

    fs::create_dir_all(asset_dir).ok()?;
    let image_path = asset_dir.join(format!("{}.bmp", Uuid::new_v4()));
    fs::write(&image_path, bmp).ok()?;

    let path = image_path.to_string_lossy().to_string();
    Some((path.clone(), path, "image/bmp".to_string(), signature))
}

fn read_clipboard_text() -> Option<String> {
    let handle = unsafe { GetClipboardData(CF_UNICODETEXT) };
    if handle.is_null() {
        return None;
    }

    let ptr = unsafe { GlobalLock(handle) };
    if ptr.is_null() {
        return None;
    }

    let mut len = 0;
    let mut cursor = ptr as *const u16;
    loop {
        if unsafe { *cursor } == 0 {
            break;
        }
        len += 1;
        cursor = unsafe { cursor.add(1) };
    }

    let slice = unsafe { std::slice::from_raw_parts(ptr as *const u16, len) };
    let text = String::from_utf16_lossy(slice);

    unsafe {
        GlobalUnlock(handle);
    }

    Some(text)
}

fn detect_content_type(text: &str) -> String {
    let trimmed = text.trim();
    let code_markers = [
        "function ",
        "const ",
        "let ",
        "class ",
        "import ",
        "SELECT ",
        "#include",
        "def ",
        "fn ",
        "=>",
    ];

    if trimmed.lines().count() > 1
        && (code_markers.iter().any(|marker| trimmed.contains(marker))
            || (trimmed.contains('{') && trimmed.contains('}')))
    {
        "code".to_string()
    } else {
        "text".to_string()
    }
}

fn hash_bytes(bytes: &[u8]) -> u64 {
    let mut hasher = DefaultHasher::new();
    bytes.hash(&mut hasher);
    hasher.finish()
}

fn dib_to_bmp_bytes(dib: &[u8]) -> Vec<u8> {
    if dib.len() < 40 {
        return dib.to_vec();
    }

    let header_size = u32::from_le_bytes([dib[0], dib[1], dib[2], dib[3]]) as usize;
    let bit_count = u16::from_le_bytes([dib[14], dib[15]]) as usize;
    let clr_used = if dib.len() >= 40 {
        u32::from_le_bytes([dib[32], dib[33], dib[34], dib[35]]) as usize
    } else {
        0
    };
    let palette_entries = if bit_count <= 8 {
        if clr_used > 0 {
            clr_used
        } else {
            1usize << bit_count
        }
    } else {
        0
    };
    let pixel_offset = 14 + header_size + palette_entries * 4;
    let file_size = 14 + dib.len();

    let mut bmp = Vec::with_capacity(file_size);
    bmp.extend_from_slice(b"BM");
    bmp.extend_from_slice(&(file_size as u32).to_le_bytes());
    bmp.extend_from_slice(&[0u8; 4]);
    bmp.extend_from_slice(&(pixel_offset as u32).to_le_bytes());
    bmp.extend_from_slice(dib);
    bmp
}

#[link(name = "user32")]
extern "system" {
    fn OpenClipboard(hWnd: *mut core::ffi::c_void) -> i32;
    fn CloseClipboard() -> i32;
    fn GetClipboardData(uFormat: u32) -> *mut core::ffi::c_void;
    fn IsClipboardFormatAvailable(format: u32) -> i32;
}

#[link(name = "kernel32")]
extern "system" {
    fn GlobalLock(hMem: *mut core::ffi::c_void) -> *mut core::ffi::c_void;
    fn GlobalUnlock(hMem: *mut core::ffi::c_void) -> i32;
    fn GlobalSize(hMem: *mut core::ffi::c_void) -> usize;
}

#[link(name = "shell32")]
extern "system" {
    fn DragQueryFileW(
        hDrop: *mut core::ffi::c_void,
        iFile: u32,
        lpszFile: *mut u16,
        cch: u32,
    ) -> u32;
}
