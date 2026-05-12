export interface Reminder {
  id: number;
  title: string;
  description?: string;
  trigger_at: string;
  is_recurring: boolean;
  recurrence?: string;
  is_completed: boolean;
  is_dismissed: boolean;
  snooze_until?: string;
  created_at: string;
}

export interface CreateReminder {
  title: string;
  description?: string;
  trigger_at: string;
  is_recurring?: boolean;
  recurrence?: string;
}
