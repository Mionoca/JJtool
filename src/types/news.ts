export interface NewsArticle {
  id: number;
  title: string;
  summary: string | null;
  url: string;
  source: string | null;
  category: string | null;
  fetched_at: string;
  is_read: boolean;
}
