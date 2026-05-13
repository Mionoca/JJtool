import { useEffect, useState } from "react";
import { useClipboardStore } from "@/stores/clipboardStore";

export default function ClipboardSearch() {
  const { search, setSearch } = useClipboardStore();
  const [local, setLocal] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(local);
    }, 300);
    return () => clearTimeout(timer);
  }, [local, setSearch]);

  return (
    <div className="px-3 py-2">
      <div className="relative">
        <input
          type="text"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder="搜索剪贴板内容..."
          className="w-full pl-8 pr-8 py-2 text-sm glass rounded-fluent
            text-fluent-text placeholder:text-fluent-muted/60
            focus:outline-none focus:ring-2 focus:ring-primary-300/50
            transition-all"
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fluent-muted text-sm">
          🔎
        </span>
        {local && (
          <button
            onClick={() => setLocal("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-fluent-muted hover:text-fluent-text rounded-full hover:bg-gray-200/60 text-xs transition-colors"
            title="清空搜索"
          >
            x
          </button>
        )}
      </div>
    </div>
  );
}
