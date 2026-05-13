use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardItem {
    pub id: i64,
    pub content: String,
    pub content_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preview: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_data: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_app: Option<String>,
    pub is_favorite: bool,
    pub is_pinned: bool,
    pub tags: Vec<String>,
    pub created_at: String,
    pub expires_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateClipboardItem {
    pub content: String,
    pub content_type: String,
    pub preview: Option<String>,
    pub mime_type: Option<String>,
    pub image_data: Option<String>,
    pub source_app: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardFilter {
    pub search: Option<String>,
    pub content_type: Option<String>,
    pub favorites_only: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}
