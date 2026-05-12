import { useReminderStore } from "@/stores/reminderStore";
import type { Reminder } from "@/types/reminder";

interface Props {
  reminder: Reminder;
}

export default function ReminderPopup({ reminder }: Props) {
  const { completeReminder, snoozeReminder, dismissReminder } =
    useReminderStore();

  return (
    <div className="glass rounded-fluent shadow-fluent p-4 animate-bubble-appear max-w-xs">
      {/* Pet speech */}
      <div className="flex items-start gap-2 mb-3">
        <span className="text-2xl">🔔</span>
        <div>
          <p className="text-sm text-fluent-text">
            主人，{reminder.title}的时间到啦～
          </p>
          {reminder.description && (
            <p className="text-xs text-fluent-muted mt-1">
              {reminder.description}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 justify-end">
        <button
          onClick={() => snoozeReminder(reminder.id, 10)}
          className="px-2.5 py-1 text-xs text-fluent-muted hover:bg-gray-100 rounded transition-colors"
        >
          10分钟后
        </button>
        <button
          onClick={() => dismissReminder(reminder.id)}
          className="px-2.5 py-1 text-xs text-fluent-muted hover:bg-gray-100 rounded transition-colors"
        >
          忽略
        </button>
        <button
          onClick={() => completeReminder(reminder.id)}
          className="px-2.5 py-1 text-xs text-white bg-green-500 hover:bg-green-600 rounded transition-colors"
        >
          ✓ 完成
        </button>
      </div>
    </div>
  );
}
