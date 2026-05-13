import type { StudyTask } from "@/types/study";

interface Props {
  task: StudyTask;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

const priorityText: Record<number, string> = {
  1: "普通",
  2: "重要",
  3: "紧急",
};

export default function TaskItem({ task, onToggle, onDelete }: Props) {
  return (
    <div className="flex items-start gap-2 py-2 group">
      <button
        onClick={() => onToggle(task.id)}
        className={`
          mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
          ${
            task.is_done
              ? "bg-primary-500 border-primary-500"
              : "border-gray-300 hover:border-primary-400"
          }
        `}
        title={task.is_done ? "标记为未完成" : "标记为完成"}
      >
        {task.is_done && (
          <svg
            className="w-2.5 h-2.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm break-words ${
              task.is_done ? "line-through text-fluent-muted" : "text-fluent-text"
            }`}
          >
            {task.title}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/60 text-fluent-muted flex-shrink-0">
            {priorityText[task.priority] || "普通"}
          </span>
        </div>

        {task.notes && (
          <p className="text-xs text-fluent-muted mt-0.5 break-words">{task.notes}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-fluent-muted">
          {task.duration_min && <span>{task.duration_min} 分钟</span>}
          {task.reminder_enabled && task.reminder_at && (
            <span>提醒时间：{task.reminder_at.replace("T", " ")}</span>
          )}
          {task.is_recurring && <span>重复提醒</span>}
        </div>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
        title="删除任务"
      >
        x
      </button>
    </div>
  );
}
