import { useMemo, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { writeImage, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useClipboardStore } from "@/stores/clipboardStore";
import type { ClipboardItem as ClipItemType } from "@/types/clipboard";

interface Props {
  item: ClipItemType;
}

const typeLabels: Record<ClipItemType["content_type"], string> = {
  text: "文本",
  image: "图片",
  file: "文件",
  code: "代码",
};

function parseFilePaths(content: string) {
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
}

function fileName(path: string) {
  return path.split(/[\\/]/).filter(Boolean).pop() || path;
}

export default function ClipboardItemComponent({ item }: Props) {
  const { deleteItem, toggleFavorite } = useClipboardStore();
  const [copied, setCopied] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const filePaths = useMemo(
    () => (item.content_type === "file" ? parseFilePaths(item.content) : []),
    [item.content, item.content_type]
  );

  const imagePath = item.preview || item.image_data || item.content;
  const imageSrc = item.content_type === "image" && imagePath ? convertFileSrc(imagePath) : "";

  const handleCopy = async () => {
    try {
      if (item.content_type === "image") {
        try {
          await writeImage(item.content);
        } catch {
          await writeText(item.content);
        }
      } else if (item.content_type === "file") {
        await writeText(filePaths.length > 0 ? filePaths.join("\n") : item.content);
      } else {
        await writeText(item.content);
      }

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
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  };

  const isUrl = item.content.startsWith("http");
  const isFilePath =
    item.content_type === "file" ||
    /^[A-Z]:\\/.test(item.content) ||
    item.content.startsWith("\\\\");

  const previewText =
    item.preview ||
    (item.content.length > 150 ? `${item.content.slice(0, 150)}...` : item.content);

  return (
    <div
      className={`
        group relative px-3 py-2.5 my-0.5 rounded-fluent cursor-pointer
        transition-all duration-150
        ${item.is_pinned ? "bg-primary-50/80 border border-primary-200/50" : "hover:bg-gray-50/80"}
        ${copied ? "ring-2 ring-green-400/50" : ""}
      `}
      onClick={() => {
        if (item.content_type === "image") {
          setShowImagePreview(true);
        } else {
          void handleCopy();
        }
      }}
    >
      {item.is_pinned && (
        <div className="absolute top-1 left-1 text-xs text-primary-400" title="置顶">
          📌
        </div>
      )}

      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-fluent-muted">
          {typeLabels[item.content_type]}
        </span>
        <span className="text-xs text-fluent-muted">{formatTime(item.created_at)}</span>
        {item.mime_type && (
          <span className="text-xs text-fluent-muted truncate max-w-[120px]">
            {item.mime_type}
          </span>
        )}
      </div>

      {item.content_type === "image" ? (
        <div className="space-y-2">
          <img
            src={imageSrc}
            alt="剪贴板图片缩略图"
            className="max-h-28 w-full rounded-lg object-contain bg-white/70 border border-white/40"
          />
          <p className="text-xs text-fluent-muted break-all">{item.content}</p>
        </div>
      ) : item.content_type === "file" ? (
        <div className="space-y-1">
          <p className="text-sm text-fluent-text">{filePaths.length} 个文件</p>
          {filePaths.slice(0, 3).map((path) => (
            <div key={path} className="text-xs text-fluent-muted">
              <div className="font-medium text-fluent-text break-all">{fileName(path)}</div>
              <div className="break-all">{path}</div>
            </div>
          ))}
          {filePaths.length > 3 && (
            <p className="text-xs text-fluent-muted">还有 {filePaths.length - 3} 个文件</p>
          )}
        </div>
      ) : (
        <p
          className={`text-sm text-fluent-text whitespace-pre-wrap break-all leading-relaxed ${
            item.content_type === "code" ? "font-mono text-xs" : ""
          } ${isUrl ? "text-primary-600 underline" : ""} ${
            isFilePath ? "text-accent-600" : ""
          }`}
        >
          {previewText}
        </p>
      )}

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

      <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5 no-drag">
        <button
          onClick={(e) => {
            e.stopPropagation();
            void handleCopy();
          }}
          className="w-6 h-6 flex items-center justify-center text-xs rounded hover:bg-gray-200/80 transition-colors"
          title="复制"
        >
          ⧉
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            void toggleFavorite(item.id);
          }}
          className="w-6 h-6 flex items-center justify-center text-xs rounded hover:bg-gray-200/80 transition-colors"
          title={item.is_favorite ? "取消收藏" : "收藏"}
        >
          {item.is_favorite ? "★" : "☆"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            void deleteItem(item.id);
          }}
          className="w-6 h-6 flex items-center justify-center text-xs rounded hover:bg-red-100 text-red-400 transition-colors"
          title="删除"
        >
          x
        </button>
      </div>

      {copied && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-50/90 rounded-fluent animate-fade-in">
          <span className="text-sm text-green-600 font-medium">已复制</span>
        </div>
      )}

      {showImagePreview && item.content_type === "image" && (
        <div
          className="fixed inset-0 z-[9999] bg-black/45 flex items-center justify-center p-6"
          onClick={(e) => {
            e.stopPropagation();
            setShowImagePreview(false);
          }}
        >
          <img
            src={imageSrc}
            alt="剪贴板图片预览"
            className="max-w-full max-h-full rounded-xl shadow-2xl bg-white"
          />
        </div>
      )}
    </div>
  );
}
