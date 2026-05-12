export interface StickyNote {
  id: number;
  title: string | null;
  content: string;
  content_type: string;
  color: string;
  priority: number;
  is_pinned: boolean;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStickyNote {
  title?: string;
  content: string;
  content_type?: string;
  color?: string;
  priority?: number;
}
