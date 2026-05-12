import { useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useClipboardStore } from "@/stores/clipboardStore";
import type { ClipboardItem as ClipItemType } from "@/types/clipboard";

interface Props {
  item: ClipItemType;
}

export default function ClipboardItemComponent({ item }: Props) {
  const { deleteItem, toggleFavorite } = useClipboardStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await writeText(item.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  };

  const isUrl = item.content.startsWith("http");
  const isFilePath =
    item.content_type === "file" ||
    /^[A-Z]:\\/.test(item.content) ||
    item.content.startsWith("\\\\");

  const preview =
    item.content.length > 150
      ? item.content.slice(0, 150) + "..."
      : item.content;

  return (
    <div
      className={`
        group relative px-3 py-2.5 my-0.5 rounded-fluent cursor-pointer
        transition-all duration-150
        ${item.is_pinned ? "bg-primary-50/80 border border-primary-200/50" : "hover:bg-gray-50/80"}
        ${copied ? "ring-2 ring-green-400/50" : ""}
      `}
      onClick={handleCopy}
    >
      {/* Pinned indicator */}
      {item.is_pinned && (
        <div className="absolute top-1 left-1 text-xs text-primary-400">
          📌
        </div>
      )}

      {/* Content type badge */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-fluent-muted">
          {item.content_type === "text" && "文本"}
          {item.content_type === "image" && "图片"}
          {item.content_type === "file" && "文件"}
          {item.content_type === "code" && "代码"}
        </span>
        <span className="text-xs text-fluent-muted">
          {formatTime(item.created_at)}
        </span>
        {item.source_app && (
          <span className="text-xs text-fluent-muted truncate max-w-[100px]">
            {item.source_app}
          </span>
        )}
      </div>

      {/* Content preview */}
      <p
        className={`text-sm text-fluent-text whitespace-pre-wrap break-all leading-relaxed ${
          item.content_type === "code" ? "font-mono text-xs" : ""
        } ${isUrl ? "text-primary-600 underline" : ""} ${
          isFilePath ? "text-accent-600" : ""
        }`}
      >
        {preview}
      </p>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="flex gap-1 mt-1.5">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 rounded-full bg-accent-50 text-accent-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Hover actions */}
      <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5 no-drag">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(item.id);
          }}
          className="w-6 h-6 flex items-center justify-center text-xs rounded hover:bg-gray-200/80 transition-colors"
          title={item.is_favorite ? "取消收藏" : "收藏"}
        >
          {item.is_favorite ? "⭐" : "☆"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteItem(item.id);
          }}
          className="w-6 h-6 flex items-center justify-center text-xs rounded hover:bg-red-100 text-red-400 transition-colors"
          title="删除"
        >
          🗑
        </button>
      </div>

      {/* Copied feedback */}
      {copied && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-50/90 rounded-fluent animate-fade-in">
          <span className="text-sm text-green-600 font-medium">
            ✓ 已复制
          </span>
        </div>
      )}
    </div>
  );
}
