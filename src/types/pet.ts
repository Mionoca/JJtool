export type PetMood = "happy" | "normal" | "angry" | "sleepy" | "working";

export interface PetState {
  mood: PetMood;
  message: string;
}

export interface PetMenuAction {
  id: string;
  label: string;
  icon: string;
}
