export interface StudyPlan {
  id: number;
  title: string;
  description: string | null;
  plan_date: string;
  plan_type: string;
  is_completed: boolean;
  created_at: string;
  tasks: StudyTask[];
}

export interface StudyTask {
  id: number;
  plan_id: number;
  title: string;
  notes: string | null;
  duration_min: number | null;
  reminder_at: string | null;
  reminder_enabled: boolean;
  is_recurring: boolean;
  recurrence: string | null;
  priority: number;
  reminder_id: number | null;
  is_done: boolean;
  sort_order: number;
}

export interface AddStudyTaskInput {
  title: string;
  notes?: string | null;
  duration_min?: number | null;
  reminder_at?: string | null;
  reminder_enabled?: boolean;
  is_recurring?: boolean;
  recurrence?: string | null;
  priority?: number;
}
