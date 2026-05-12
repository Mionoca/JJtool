import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Reminder, CreateReminder } from "@/types/reminder";

interface ReminderStore {
  reminders: Reminder[];
  loading: boolean;
  showInput: boolean;
  activeReminder: Reminder | null;

  setShowInput: (show: boolean) => void;
  setActiveReminder: (r: Reminder | null) => void;
  fetchReminders: () => Promise<void>;
  createReminder: (data: CreateReminder) => Promise<Reminder>;
  completeReminder: (id: number) => Promise<void>;
  snoozeReminder: (id: number, minutes: number) => Promise<void>;
  dismissReminder: (id: number) => Promise<void>;
  deleteReminder: (id: number) => Promise<void>;
  parseTime: (input: string) => Promise<string | null>;
}

export const useReminderStore = create<ReminderStore>((set, get) => ({
  reminders: [],
  loading: false,
  showInput: false,
  activeReminder: null,

  setShowInput: (show) => set({ showInput: show }),
  setActiveReminder: (r) => set({ activeReminder: r }),

  fetchReminders: async () => {
    set({ loading: true });
    try {
      const items = await invoke<Reminder[]>("get_all_reminders");
      set({ reminders: items, loading: false });
    } catch (e) {
      console.error("Failed to fetch reminders:", e);
      set({ loading: false });
    }
  },

  createReminder: async (data) => {
    const item = await invoke<Reminder>("create_reminder", {
      title: data.title,
      description: data.description || null,
      triggerAt: data.trigger_at,
      isRecurring: data.is_recurring || false,
      recurrence: data.recurrence || null,
    });
    await get().fetchReminders();
    return item;
  },

  completeReminder: async (id) => {
    await invoke("complete_reminder", { id });
    await get().fetchReminders();
  },

  snoozeReminder: async (id, minutes) => {
    await invoke("snooze_reminder", { id, minutes });
    await get().fetchReminders();
    set({ activeReminder: null });
  },

  dismissReminder: async (id) => {
    await invoke("dismiss_reminder", { id });
    set({ activeReminder: null });
  },

  deleteReminder: async (id) => {
    await invoke("delete_reminder", { id });
    await get().fetchReminders();
  },

  parseTime: async (input) => {
    try {
      const result = await invoke<string | null>("parse_reminder_time", { input });
      return result;
    } catch {
      return null;
    }
  },
}));
