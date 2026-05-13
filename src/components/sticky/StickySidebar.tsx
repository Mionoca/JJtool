import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useStickyStore } from "@/stores/stickyStore";
import { useWindowSizePersistence } from "@/hooks/useWindowSizePersistence";
import StickyNoteCard from "./StickyNote";

const COLORS = [
  { name: "黄", value: "#FFFBEB" },
  { name: "粉", value: "#FCE7F3" },
  { name: "蓝", value: "#DBEAFE" },
  { name: "绿", value: "#D1FAE5" },
  { name: "紫", value: "#EDE9FE" },
  { name: "橙", value: "#FFEDD5" },
];

export default function StickySidebar() {
  const { notes, loading, fetchNotes, createNote, setShowSidebar } =
    useStickyStore();
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0].value);

  useWindowSizePersistence("sticky", { width: 320, height: 560 });

  useEffect(() => {
    void fetchNotes();
    const unlisten = listen("sticky-open-add-note", () => {
      setShowNew(true);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [fetchNotes]);

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    await createNote({
      title: newTitle.trim() || undefined,
      content: newContent,
      color: newColor,
    });
    setNewTitle("");
    setNewContent("");
    setShowNew(false);
  };

  const handleClose = async () => {
    await getCurrentWindow().hide();
    setShowSidebar(false);
  };

  return (
    <div className="h-full flex flex-col glass shadow-fluent overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-fluent-border/30 drag-region">
        <h2 className="text-sm font-semibold text-fluent-text flex items-center gap-2">
          <span>📝</span> 便签
        </h2>
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={() => setShowNew(!showNew)}
            className="w-7 h-7 flex items-center justify-center text-fluent-muted hover:text-primary-500 hover:bg-primary-50 rounded transition-colors"
            title="新建便签"
          >
            +
          </button>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center text-fluent-muted hover:text-fluent-text hover:bg-gray-100 rounded transition-colors"
            title="关闭"
          >
            x
          </button>
        </div>
      </div>

      {showNew && (
        <div className="px-3 py-2 border-b border-fluent-border/30 animate-bubble-appear">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="标题（可选）"
            className="w-full px-2 py-1.5 text-sm bg-transparent border-b border-fluent-border/30
              text-fluent-text placeholder:text-fluent-muted/50 focus:outline-none mb-2"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="写点什么..."
            rows={3}
            className="w-full px-2 py-1.5 text-sm bg-transparent border border-fluent-border/30 rounded
              text-fluent-text placeholder:text-fluent-muted/50 focus:outline-none resize-none"
          />
          <div className="flex items-center gap-1 mt-2">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setNewColor(c.value)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  newColor === c.value
                    ? "border-primary-500 scale-110"
                    : "border-transparent"
                }`}
                style={{ background: c.value }}
                title={c.name}
              />
            ))}
            <div className="flex-1" />
            <button
              onClick={handleCreate}
              disabled={!newContent.trim()}
              className="px-3 py-1 text-xs text-white bg-primary-500 hover:bg-primary-600
                rounded transition-colors disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {loading && notes.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-fluent-muted text-sm">
            加载中...
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-fluent-muted text-sm gap-1">
            <span className="text-2xl">📝</span>
            <span>暂无便签</span>
          </div>
        ) : (
          notes.map((note) => <StickyNoteCard key={note.id} note={note} />)
        )}
      </div>

      <div className="px-4 py-2 border-t border-fluent-border/30 text-xs text-fluent-muted text-center">
        {notes.length} 条便签
      </div>
    </div>
  );
}
