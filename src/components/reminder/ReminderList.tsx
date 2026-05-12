import { useEffect } from "react";
import { useReminderStore } from "@/stores/reminderStore";
import type { Reminder } from "@/types/reminder";

export default function ReminderList() {
  const { reminders, loading, fetchReminders, deleteReminder, completeReminder } =
    useReminderStore();

  useEffect(() => {
    fetchReminders();
  }, []);

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    const timeStr = d.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) return `今天 ${timeStr}`;
    if (isTomorrow) return `明天 ${timeStr}`;
    return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" }) + ` ${timeStr}`;
  };

  const pending = reminders.filter(
    (r) => !r.is_completed && !r.is_dismissed
  );
  const completed = reminders.filter((r) => r.is_completed);

  return (
    <div className="glass rounded-fluent shadow-fluent overflow-hidden">
      <div className="px-4 py-3 border-b border-fluent-border/30">
        <h2 className="text-sm font-semibold text-fluent-text flex items-center gap-2">
          <span>⏰</span> 提醒列表
        </h2>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {loading && reminders.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-fluent-muted text-sm">
            加载中...
          </div>
        ) : reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-fluent-muted text-sm gap-1">
            <span className="text-2xl">📭</span>
            <span>暂无提醒</span>
          </div>
        ) : (
          <div className="divide-y divide-fluent-border/20">
            {/* Pending */}
            {pending.map((r) => (
              <ReminderItem
                key={r.id}
                reminder={r}
                onComplete={completeReminder}
                onDelete={deleteReminder}
                formatTime={formatTime}
              />
            ))}

            {/* Completed */}
            {completed.length > 0 && (
              <>
                <div className="px-4 py-1.5 text-xs text-fluent-muted bg-gray-50/50">
                  已完成
                </div>
                {completed.map((r) => (
                  <ReminderItem
                    key={r.id}
                    reminder={r}
                    onComplete={completeReminder}
                    onDelete={deleteReminder}
                    formatTime={formatTime}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ReminderItem({
  reminder,
  onComplete,
  onDelete,
  formatTime,
}: {
  reminder: Reminder;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
  formatTime: (s: string) => string;
}) {
  const isPast = new Date(reminder.trigger_at) < new Date();
  const isDone = reminder.is_completed;

  return (
    <div
      className={`px-4 py-2.5 flex items-center gap-3 ${
        isDone ? "opacity-60" : ""
      }`}
    >
      <button
        onClick={() => onComplete(reminder.id)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          isDone
            ? "bg-green-500 border-green-500 text-white"
            : "border-gray-300 hover:border-primary-400"
        }`}
      >
        {isDone && <span className="text-xs">✓</span>}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            isDone ? "line-through text-fluent-muted" : "text-fluent-text"
          }`}
        >
          {reminder.title}
        </p>
        <p className="text-xs text-fluent-muted flex items-center gap-1">
          <span
            className={isPast && !isDone ? "text-red-400" : ""}
          >
            {formatTime(reminder.trigger_at)}
          </span>
          {reminder.is_recurring && (
            <span className="text-primary-400">🔄 周期</span>
          )}
        </p>
      </div>

      <button
        onClick={() => onDelete(reminder.id)}
        className="w-6 h-6 flex items-center justify-center text-xs text-fluent-muted hover:text-red-400 hover:bg-red-50 rounded transition-colors flex-shrink-0"
      >
        🗑
      </button>
    </div>
  );
}
