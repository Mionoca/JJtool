use std::ffi::c_void;
use std::fs;
use std::mem;
use std::ptr;
use std::sync::Arc;

use tauri::State;

use crate::db::Database;
use crate::models::clipboard::{ClipboardFilter, ClipboardItem, CreateClipboardItem};

const CF_UNICODETEXT: u32 = 13;
const CF_DIB: u32 = 8;
const CF_HDROP: u32 = 15;
const GMEM_MOVEABLE: u32 = 0x0002;
const DROPEFFECT_COPY: u32 = 1;

#[repr(C)]
#[allow(non_snake_case)]
struct POINT {
    x: i32,
    y: i32,
}

#[repr(C)]
#[allow(non_snake_case)]
struct DROPFILES {
    pFiles: u32,
    pt: POINT,
    fNC: i32,
    fWide: i32,
}

#[tauri::command]
pub fn get_clipboard_history(
    db: State<'_, Arc<Database>>,
    search: Option<String>,
    content_type: Option<String>,
    favorites_only: Option<bool>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<ClipboardItem>, String> {
    let filter = ClipboardFilter {
        search,
        content_type,
        favorites_only,
        limit,
        offset,
    };
    db.get_clipboard_history(&filter)
}

#[tauri::command]
pub fn insert_clipboard_item(
    db: State<'_, Arc<Database>>,
    content: String,
    content_type: Option<String>,
    preview: Option<String>,
    mime_type: Option<String>,
    image_data: Option<String>,
    source_app: Option<String>,
) -> Result<ClipboardItem, String> {
    let item = CreateClipboardItem {
        content,
        content_type: content_type.unwrap_or_else(|| "text".to_string()),
        preview,
        mime_type,
        image_data,
        source_app,
    };
    db.insert_clipboard(&item)
}

#[tauri::command]
pub fn restore_clipboard_item(db: State<'_, Arc<Database>>, id: i64) -> Result<(), String> {
    let item = db.get_clipboard_item(id)?;
    match item.content_type.as_str() {
        "image" => write_image_file_to_clipboard(&item.content),
        "file" => {
            let paths = parse_file_paths(&item.content);
            if paths.is_empty() {
                return Err("文件记录中没有可恢复的路径".to_string());
            }
            write_file_list_to_clipboard(&paths)
        }
        "code" | "text" => write_text_to_clipboard(&item.content),
        _ => write_text_to_clipboard(&item.content),
    }
}

#[tauri::command]
pub fn delete_clipboard_item(db: State<'_, Arc<Database>>, id: i64) -> Result<(), String> {
    db.delete_clipboard(id)
}

#[tauri::command]
pub fn toggle_clipboard_favorite(db: State<'_, Arc<Database>>, id: i64) -> Result<bool, String> {
    db.toggle_favorite(id)
}

#[tauri::command]
pub fn clear_clipboard_history(db: State<'_, Arc<Database>>) -> Result<(), String> {
    db.clear_clipboard_history()
}

#[tauri::command]
pub fn copy_to_clipboard(text: String) -> Result<(), String> {
    write_text_to_clipboard(&text)
}

fn parse_file_paths(content: &str) -> Vec<String> {
    serde_json::from_str::<Vec<String>>(content).unwrap_or_else(|_| {
        content
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty())
            .map(ToString::to_string)
            .collect()
    })
}

fn write_text_to_clipboard(text: &str) -> Result<(), String> {
    let mut wide: Vec<u16> = text.encode_utf16().collect();
    wide.push(0);
    let bytes = unsafe {
        std::slice::from_raw_parts(wide.as_ptr() as *const u8, wide.len() * mem::size_of::<u16>())
    };
    set_single_clipboard_format(CF_UNICODETEXT, bytes)
}

fn write_image_file_to_clipboard(path: &str) -> Result<(), String> {
    let bytes = fs::read(path).map_err(|e| format!("读取图片失败：{}", e))?;
    let dib = if bytes.len() > 14 && &bytes[0..2] == b"BM" {
        bytes[14..].to_vec()
    } else {
        bytes
    };

    if dib.len() < 40 {
        return Err("图片数据不是有效的 DIB/BMP 格式".to_string());
    }

    set_single_clipboard_format(CF_DIB, &dib)
}

fn write_file_list_to_clipboard(paths: &[String]) -> Result<(), String> {
    let mut data = Vec::new();
    let header = DROPFILES {
        pFiles: mem::size_of::<DROPFILES>() as u32,
        pt: POINT { x: 0, y: 0 },
        fNC: 0,
        fWide: 1,
    };
    let header_bytes = unsafe {
        std::slice::from_raw_parts(
            &header as *const DROPFILES as *const u8,
            mem::size_of::<DROPFILES>(),
        )
    };
    data.extend_from_slice(header_bytes);

    for path in paths {
        for unit in path.encode_utf16() {
            data.extend_from_slice(&unit.to_le_bytes());
        }
        data.extend_from_slice(&0u16.to_le_bytes());
    }
    data.extend_from_slice(&0u16.to_le_bytes());

    let preferred_drop_effect = wide_null("Preferred DropEffect");
    let drop_effect_format = unsafe { RegisterClipboardFormatW(preferred_drop_effect.as_ptr()) };
    let drop_effect_bytes = DROPEFFECT_COPY.to_le_bytes();

    open_clipboard()?;
    let result = unsafe {
        if EmptyClipboard() == 0 {
            Err("清空剪贴板失败".to_string())
        } else {
            set_clipboard_handle(CF_HDROP, &data)?;
            if drop_effect_format != 0 {
                set_clipboard_handle(drop_effect_format, &drop_effect_bytes)?;
            }
            Ok(())
        }
    };
    unsafe {
        CloseClipboard();
    }
    result
}

fn set_single_clipboard_format(format: u32, data: &[u8]) -> Result<(), String> {
    open_clipboard()?;
    let result = unsafe {
        if EmptyClipboard() == 0 {
            Err("清空剪贴板失败".to_string())
        } else {
            set_clipboard_handle(format, data)
        }
    };
    unsafe {
        CloseClipboard();
    }
    result
}

fn open_clipboard() -> Result<(), String> {
    let opened = unsafe { OpenClipboard(ptr::null_mut()) };
    if opened == 0 {
        Err("打开系统剪贴板失败，请稍后重试".to_string())
    } else {
        Ok(())
    }
}

unsafe fn set_clipboard_handle(format: u32, data: &[u8]) -> Result<(), String> {
    let handle = GlobalAlloc(GMEM_MOVEABLE, data.len());
    if handle.is_null() {
        return Err("分配剪贴板内存失败".to_string());
    }

    let target = GlobalLock(handle);
    if target.is_null() {
        let _ = GlobalFree(handle);
        return Err("锁定剪贴板内存失败".to_string());
    }

    ptr::copy_nonoverlapping(data.as_ptr(), target as *mut u8, data.len());
    GlobalUnlock(handle);

    if SetClipboardData(format, handle).is_null() {
        let _ = GlobalFree(handle);
        return Err("写入系统剪贴板失败".to_string());
    }

    Ok(())
}

fn wide_null(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

#[link(name = "user32")]
extern "system" {
    fn OpenClipboard(hWnd: *mut c_void) -> i32;
    fn CloseClipboard() -> i32;
    fn EmptyClipboard() -> i32;
    fn SetClipboardData(uFormat: u32, hMem: *mut c_void) -> *mut c_void;
    fn RegisterClipboardFormatW(lpszFormat: *const u16) -> u32;
}

#[link(name = "kernel32")]
extern "system" {
    fn GlobalAlloc(uFlags: u32, dwBytes: usize) -> *mut c_void;
    fn GlobalLock(hMem: *mut c_void) -> *mut c_void;
    fn GlobalUnlock(hMem: *mut c_void) -> i32;
    fn GlobalFree(hMem: *mut c_void) -> *mut c_void;
}
