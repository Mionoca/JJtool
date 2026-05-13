export interface ClipboardItem {
  id: number;
  content: string;
  content_type: "text" | "image" | "file" | "code";
  preview?: string;
  mime_type?: string;
  image_data?: string;
  source_app?: string;
  is_favorite: boolean;
  is_pinned: boolean;
  tags: string[];
  created_at: string;
  expires_at: string;
}

export interface ClipboardFilter {
  search?: string;
  content_type?: string;
  favorites_only?: boolean;
  limit?: number;
  offset?: number;
}
