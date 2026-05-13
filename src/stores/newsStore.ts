import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { NewsArticle } from "@/types/news";

interface NewsStore {
  articles: NewsArticle[];
  loading: boolean;
  error: string | null;
  lastRefreshCount: number | null;
  showPanel: boolean;

  setShowPanel: (show: boolean) => void;
  fetchArticles: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export const useNewsStore = create<NewsStore>((set, get) => ({
  articles: [],
  loading: false,
  error: null,
  lastRefreshCount: null,
  showPanel: false,

  setShowPanel: (show) => set({ showPanel: show }),

  fetchArticles: async () => {
    set({ loading: true, error: null });
    try {
      const items = await invoke<NewsArticle[]>("get_news_articles", { limit: 50 });
      set({ articles: items, loading: false, error: null });
    } catch (e) {
      set({ loading: false, error: errorMessage(e) });
    }
  },

  markRead: async (id) => {
    await invoke("mark_news_read", { id });
    set({
      articles: get().articles.map((a) =>
        a.id === id ? { ...a, is_read: true } : a
      ),
    });
  },

  refresh: async () => {
    set({ loading: true, error: null, lastRefreshCount: null });
    try {
      const count = await invoke<number>("refresh_news");
      const items = await invoke<NewsArticle[]>("get_news_articles", { limit: 50 });
      set({
        articles: items,
        loading: false,
        error: null,
        lastRefreshCount: count,
      });
    } catch (e) {
      set({ loading: false, error: errorMessage(e), lastRefreshCount: null });
    }
  },
}));
