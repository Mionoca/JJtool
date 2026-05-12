import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useReminderStore } from "@/stores/reminderStore";

interface Props {
  onClose: () => void;
}

export default function ReminderInput({ onClose }: Props) {
  const { createReminder } = useReminderStore();
  const [input, setInput] = useState("");
  const [parsedTime, setParsedTime] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef<number>();

  // Auto-parse time as user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (input.trim().length < 3) {
      setParsedTime(null);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      setParsing(true);
      try {
        const result = await invoke<string | null>("parse_reminder_time", {
          input: input,
        });
        setParsedTime(result);
      } catch {
        setParsedTime(null);
      }
      setParsing(false);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input]);

  const handleCreate = async () => {
    if (!input.trim() || !parsedTime) return;
    setCreating(true);
    try {
      // Extract title: remove time-related parts
      const title = input
        .replace(/\d+分钟后/g, "")
        .replace(/\d+小时后/g, "")
        .replace(/明天|后天|大后天|今天/g, "")
        .replace(/[上下]午/g, "")
        .replace(/[周星期][一二三四五六日天]/g, "")
        .replace(/\d{1,2}[点时:：]\d{0,2}[分]?/g, "")
        .replace(/[一二两三四五六七八九十]+[点时]/g, "")
        .replace(/提醒我|提醒/g, "")
        .trim();

      await createReminder({
        title: title || input.trim(),
        trigger_at: parsedTime,
      });
      setInput("");
      setParsedTime(null);
      onClose();
    } catch (e) {
      console.error("Failed to create reminder:", e);
    }
    setCreating(false);
  };

  const formatDisplayTime = (isoStr: string) => {
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
    return d.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    }) + ` ${timeStr}`;
  };

  return (
    <div className="glass rounded-fluent shadow-fluent p-4 animate-bubble-appear">
      <h3 className="text-sm font-semibold text-fluent-text mb-3 flex items-center gap-2">
        <span>⏰</span> 添加提醒
      </h3>

      <div className="mb-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="例如: 明天晚上七点提醒我写作业"
          className="w-full px-3 py-2 text-sm glass rounded-fluent
            text-fluent-text placeholder:text-fluent-muted/60
            focus:outline-none focus:ring-2 focus:ring-primary-300/50"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
            if (e.key === "Escape") onClose();
          }}
        />
      </div>

      {/* Parsed time preview */}
      {parsing && (
        <div className="text-xs text-fluent-muted mb-2">解析中...</div>
      )}
      {parsedTime && !parsing && (
        <div className="text-xs text-primary-600 mb-2 flex items-center gap-1">
          <span>✓</span>
          <span>提醒时间: {formatDisplayTime(parsedTime)}</span>
        </div>
      )}
      {!parsedTime && !parsing && input.length >= 3 && (
        <div className="text-xs text-fluent-muted mb-2">
          未能识别时间，请尝试更明确的表达
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs text-fluent-muted hover:bg-gray-100 rounded-fluent transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleCreate}
          disabled={!parsedTime || creating}
          className="px-3 py-1.5 text-xs text-white bg-primary-500 hover:bg-primary-600
            rounded-fluent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? "创建中..." : "创建提醒"}
        </button>
      </div>

      <div className="mt-3 text-xs text-fluent-muted/60">
        支持: "40分钟后"、"明天下午3点"、"周五晚上8点"、"12月25日"
      </div>
    </div>
  );
}
