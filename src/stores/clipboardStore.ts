import { create } from "zustand";
import type { ClipboardItem } from "@/types/clipboard";
import { invoke } from "@tauri-apps/api/core";

interface ClipboardState {
  items: ClipboardItem[];
  search: string;
  loading: boolean;
  setSearch: (search: string) => void;
  fetchItems: () => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  toggleFavorite: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;
  addItem: (item: ClipboardItem) => void;
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  items: [],
  search: "",
  loading: false,

  setSearch: (search) => {
    set({ search });
    get().fetchItems();
  },

  fetchItems: async () => {
    set({ loading: true });
    try {
      const items = await invoke<ClipboardItem[]>("get_clipboard_history", {
        search: get().search || null,
        contentType: null,
        favoritesOnly: null,
        limit: 200,
        offset: 0,
      });
      set({ items });
    } catch (e) {
      console.error("Failed to fetch clipboard history:", e);
    } finally {
      set({ loading: false });
    }
  },

  deleteItem: async (id) => {
    try {
      await invoke("delete_clipboard_item", { id });
      set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    } catch (e) {
      console.error("Failed to delete:", e);
    }
  },

  toggleFavorite: async (id) => {
    try {
      await invoke("toggle_clipboard_favorite", { id });
      set((s) => ({
        items: s.items.map((i) =>
          i.id === id ? { ...i, is_favorite: !i.is_favorite } : i
        ),
      }));
    } catch (e) {
      console.error("Failed to toggle favorite:", e);
    }
  },

  clearAll: async () => {
    try {
      await invoke("clear_clipboard_history");
      set((s) => ({
        items: s.items.filter((i) => i.is_favorite || i.is_pinned),
      }));
    } catch (e) {
      console.error("Failed to clear:", e);
    }
  },

  addItem: (item) => {
    set((s) => ({
      items: [item, ...s.items.filter((i) => i.id !== item.id)],
    }));
  },
}));
