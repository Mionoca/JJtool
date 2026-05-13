import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { StudyPlan } from "@/types/study";

interface StudyStore {
  plans: StudyPlan[];
  loading: boolean;
  showPanel: boolean;
  selectedDate: string;

  setShowPanel: (show: boolean) => void;
  setSelectedDate: (date: string) => void;
  fetchPlans: (date?: string) => Promise<void>;
  createPlan: (title: string, description: string | null, planDate: string, planType?: string) => Promise<void>;
  addTask: (planId: number, title: string, durationMin?: number) => Promise<void>;
  toggleTask: (taskId: number) => Promise<void>;
  deleteTask: (taskId: number) => Promise<void>;
  deletePlan: (planId: number) => Promise<void>;
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  plans: [],
  loading: false,
  showPanel: false,
  selectedDate: new Date().toISOString().split("T")[0],

  setShowPanel: (show) => set({ showPanel: show }),
  setSelectedDate: (date) => {
    set({ selectedDate: date });
    get().fetchPlans(date);
  },

  fetchPlans: async (date?: string) => {
    set({ loading: true });
    try {
      const plans = await invoke<StudyPlan[]>("get_study_plans", {
        date: date || get().selectedDate,
      });
      set({ plans, loading: false });
    } catch (e) {
      console.error("Failed to fetch study plans:", e);
      set({ loading: false });
    }
  },

  createPlan: async (title, description, planDate, planType) => {
    await invoke("create_study_plan", {
      title,
      description,
      planDate,
      planType: planType || "daily",
    });
    await get().fetchPlans();
  },

  addTask: async (planId, title, durationMin) => {
    await invoke("add_study_task", {
      planId,
      title,
      durationMin: durationMin || null,
    });
    await get().fetchPlans();
  },

  toggleTask: async (taskId) => {
    await invoke("toggle_study_task", { id: taskId });
    await get().fetchPlans();
  },

  deleteTask: async (taskId) => {
    await invoke("delete_study_task", { id: taskId });
    await get().fetchPlans();
  },

  deletePlan: async (planId) => {
    await invoke("delete_study_plan", { id: planId });
    await get().fetchPlans();
  },
}));
