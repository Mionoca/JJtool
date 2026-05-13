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
  duration_min: number | null;
  is_done: boolean;
  sort_order: number;
}
