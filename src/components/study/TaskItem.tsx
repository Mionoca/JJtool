import type { StudyTask } from "@/types/study";

interface Props {
  task: StudyTask;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function TaskItem({ task, onToggle, onDelete }: Props) {
  return (
    <div className="flex items-center gap-2 py-1.5 group">
      <button
        onClick={() => onToggle(task.id)}
        className={`
          w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
          ${
            task.is_done
              ? "bg-primary-500 border-primary-500"
              : "border-gray-300 hover:border-primary-400"
          }
        `}
      >
        {task.is_done && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span
        className={`text-sm flex-1 ${
          task.is_done ? "line-through text-fluent-muted" : "text-fluent-text"
        }`}
      >
        {task.title}
      </span>
      {task.duration_min && (
        <span className="text-xs text-fluent-muted">{task.duration_min}分钟</span>
      )}
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition-opacity"
      >
        ×
      </button>
    </div>
  );
}
