import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { NewsArticle } from "@/types/news";

interface NewsStore {
  articles: NewsArticle[];
  loading: boolean;
  showPanel: boolean;

  setShowPanel: (show: boolean) => void;
  fetchArticles: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useNewsStore = create<NewsStore>((set, get) => ({
  articles: [],
  loading: false,
  showPanel: false,

  setShowPanel: (show) => set({ showPanel: show }),

  fetchArticles: async () => {
    set({ loading: true });
    try {
      const items = await invoke<NewsArticle[]>("get_news_articles", { limit: 50 });
      set({ articles: items, loading: false });
    } catch (e) {
      console.error("Failed to fetch news:", e);
      set({ loading: false });
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
    set({ loading: true });
    try {
      await invoke("refresh_news");
      await get().fetchArticles();
    } catch (e) {
      console.error("Failed to refresh news:", e);
      set({ loading: false });
    }
  },
}));
