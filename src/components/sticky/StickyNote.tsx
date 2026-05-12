import { useState } from "react";
import { useStickyStore } from "@/stores/stickyStore";
import type { StickyNote as NoteType } from "@/types/sticky";

interface Props {
  note: NoteType;
}

export default function StickyNoteCard({ note }: Props) {
  const { updateNote, deleteNote } = useStickyStore();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);

  const handleSave = async () => {
    await updateNote(note.id, { content: editContent });
    setEditing(false);
  };

  const handleTogglePin = async () => {
    await updateNote(note.id, { is_pinned: !note.is_pinned });
  };

  const priorityLabel = ["", "❗", "‼️"][note.priority] || "";

  return (
    <div
      className="rounded-fluent p-3 shadow-sm transition-all hover:shadow-md"
      style={{ background: note.color + "CC" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          {note.is_pinned && <span className="text-xs">📌</span>}
          {priorityLabel && <span className="text-xs">{priorityLabel}</span>}
          {note.title && (
            <span className="text-xs font-semibold text-fluent-text truncate max-w-[140px]">
              {note.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 no-drag">
          <button
            onClick={handleTogglePin}
            className="w-5 h-5 flex items-center justify-center text-xs rounded hover:bg-black/5 transition-colors"
            title={note.is_pinned ? "取消置顶" : "置顶"}
          >
            📌
          </button>
          <button
            onClick={() => deleteNote(note.id)}
            className="w-5 h-5 flex items-center justify-center text-xs rounded hover:bg-red-100 text-red-400 transition-colors"
            title="删除"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Content */}
      {editing ? (
        <div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            className="w-full px-2 py-1.5 text-sm bg-white/50 border border-fluent-border/30 rounded
              text-fluent-text focus:outline-none resize-none"
            autoFocus
          />
          <div className="flex gap-1 mt-1 justify-end">
            <button
              onClick={() => {
                setEditing(false);
                setEditContent(note.content);
              }}
              className="px-2 py-0.5 text-xs text-fluent-muted hover:bg-black/5 rounded"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-2 py-0.5 text-xs text-primary-600 hover:bg-primary-50 rounded"
            >
              保存
            </button>
          </div>
        </div>
      ) : (
        <div
          className="text-sm text-fluent-text whitespace-pre-wrap break-words cursor-pointer min-h-[2rem]"
          onClick={() => {
            setEditing(true);
            setEditContent(note.content);
          }}
        >
          {note.content || "点击编辑..."}
        </div>
      )}

      {/* Footer */}
      <div className="mt-1.5 text-xs text-fluent-muted/60">
        {new Date(note.updated_at).toLocaleDateString("zh-CN", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
}
