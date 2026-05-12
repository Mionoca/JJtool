import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useClipboardStore } from "@/stores/clipboardStore";
import { useClipboardListener } from "@/hooks/useClipboard";
import ClipboardSearch from "./ClipboardSearch";
import ClipboardItemComponent from "./ClipboardItem";

export default function ClipboardPanel() {
  const { items, loading, fetchItems, clearAll } = useClipboardStore();

  useClipboardListener();

  useEffect(() => {
    fetchItems();
  }, []);

  const handleClose = async () => {
    await getCurrentWindow().hide();
  };

  return (
    <div className="h-full flex flex-col glass rounded-fluent shadow-fluent overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-fluent-border/30 drag-region">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h2 className="text-sm font-semibold text-fluent-text">
            剪贴板历史
          </h2>
          <span className="text-xs text-fluent-muted bg-primary-50 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={clearAll}
            className="px-2 py-1 text-xs text-fluent-muted hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="清空历史"
          >
            清空
          </button>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center text-fluent-muted hover:text-fluent-text hover:bg-gray-100 rounded transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Search */}
      <ClipboardSearch />

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-fluent-muted text-sm">
            加载中...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-fluent-muted text-sm gap-2">
            <span className="text-3xl">📭</span>
            <span>暂无剪贴板记录</span>
          </div>
        ) : (
          items.map((item) => (
            <ClipboardItemComponent key={item.id} item={item} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-fluent-border/30 text-xs text-fluent-muted text-center">
        Ctrl+Shift+V 打开/关闭 · 记录保留 3 天
      </div>
    </div>
  );
}
