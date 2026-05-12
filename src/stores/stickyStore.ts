import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { StickyNote, CreateStickyNote } from "@/types/sticky";

interface StickyStore {
  notes: StickyNote[];
  loading: boolean;
  showSidebar: boolean;

  setShowSidebar: (show: boolean) => void;
  fetchNotes: () => Promise<void>;
  createNote: (data: CreateStickyNote) => Promise<StickyNote>;
  updateNote: (id: number, data: Partial<StickyNote>) => Promise<void>;
  deleteNote: (id: number) => Promise<void>;
}

export const useStickyStore = create<StickyStore>((set, get) => ({
  notes: [],
  loading: false,
  showSidebar: false,

  setShowSidebar: (show) => set({ showSidebar: show }),

  fetchNotes: async () => {
    set({ loading: true });
    try {
      const items = await invoke<StickyNote[]>("get_sticky_notes");
      set({ notes: items, loading: false });
    } catch (e) {
      console.error("Failed to fetch sticky notes:", e);
      set({ loading: false });
    }
  },

  createNote: async (data) => {
    const item = await invoke<StickyNote>("create_sticky_note", {
      title: data.title || null,
      content: data.content,
      content_type: data.content_type || "markdown",
      color: data.color || "#FFFBEB",
      priority: data.priority || 0,
    });
    await get().fetchNotes();
    return item;
  },

  updateNote: async (id, data) => {
    await invoke("update_sticky_note", {
      id,
      title: data.title ?? null,
      content: data.content ?? null,
      color: data.color ?? null,
      priority: data.priority ?? null,
      isPinned: data.is_pinned ?? null,
      sortOrder: data.sort_order ?? null,
    });
    await get().fetchNotes();
  },

  deleteNote: async (id) => {
    await invoke("delete_sticky_note", { id });
    await get().fetchNotes();
  },
}));
