import { create } from "zustand";
import type { PetMood } from "@/types/pet";

interface PetState {
  mood: PetMood;
  message: string;
  isVisible: boolean;
  showMenu: boolean;
  isDragging: boolean;
  setMood: (mood: PetMood) => void;
  setMessage: (msg: string) => void;
  toggleVisibility: () => void;
  setShowMenu: (show: boolean) => void;
  setIsDragging: (dragging: boolean) => void;
}

export const usePetStore = create<PetState>((set) => ({
  mood: "normal",
  message: "",
  isVisible: true,
  showMenu: false,
  isDragging: false,

  setMood: (mood) => set({ mood }),
  setMessage: (message) => set({ message }),
  toggleVisibility: () => set((s) => ({ isVisible: !s.isVisible })),
  setShowMenu: (showMenu) => set({ showMenu }),
  setIsDragging: (isDragging) => set({ isDragging }),
}));
