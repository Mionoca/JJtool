use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StickyNote {
    pub id: i64,
    pub title: Option<String>,
    pub content: String,
    pub content_type: String,
    pub color: String,
    pub priority: i32,
    pub is_pinned: bool,
    pub sort_order: i32,
    pub is_archived: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateStickyNote {
    pub title: Option<String>,
    pub content: String,
    pub content_type: Option<String>,
    pub color: Option<String>,
    pub priority: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateStickyNote {
    pub title: Option<String>,
    pub content: Option<String>,
    pub color: Option<String>,
    pub priority: Option<i32>,
    pub is_pinned: Option<bool>,
    pub sort_order: Option<i32>,
}
