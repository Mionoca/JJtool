import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface Props {
  onClose: () => void;
  onAction?: (action: string) => void;
}

type MenuItem = {
  id: string;
  icon: string;
  label: string;
  windowLabel?: string;
};

const menuItems: MenuItem[] = [
  { id: "add-study", icon: "📚", label: "添加学习计划", windowLabel: "study" },
  { id: "add-reminder", icon: "⏰", label: "添加提醒事项" },
  { id: "add-sticky", icon: "📝", label: "添加便签", windowLabel: "sticky" },
  { id: "clipboard", icon: "📋", label: "查看剪贴板历史", windowLabel: "clipboard" },
  { id: "today-plan", icon: "✅", label: "查看今日计划", windowLabel: "study" },
  { id: "sticky", icon: "🗒️", label: "打开便签栏", windowLabel: "sticky" },
  { id: "refresh-news", icon: "📰", label: "刷新资讯", windowLabel: "news" },
  { id: "interests", icon: "🎯", label: "设置兴趣关键词", windowLabel: "settings" },
  { id: "settings", icon: "⚙️", label: "打开设置", windowLabel: "settings" },
  { id: "quit", icon: "⏻", label: "退出程序" },
];

export default function PetMenu({ onClose, onAction }: Props) {
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const openWindow = async (label: string) => {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const existing = await WebviewWindow.getByLabel(label);
      if (!existing) return;

      await existing.show();
      await existing.setFocus();
    } catch (e) {
      console.error(`Failed to open ${label} window:`, e);
    }
  };

  const handleAction = async (item: MenuItem) => {
    if (busyAction !== null) return;
    setBusyAction(item.id);

    onAction?.(item.id);
    onClose();

    try {
      if (item.id === "refresh-news") {
        void import("@tauri-apps/api/core").then(({ invoke }) =>
          invoke("refresh_news").catch((e) => {
            console.error("Failed to refresh news:", e);
          })
        );
      }

      if (item.windowLabel) {
        await openWindow(item.windowLabel);
      }

      if (item.id === "quit") {
        await getCurrentWindow().close();
      }
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div
      className="glass rounded-fluent shadow-fluent py-2 min-w-[240px] max-w-[280px] max-h-[460px] overflow-y-auto animate-fade-in z-50"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {menuItems.map((item) => (
        <button
          key={item.id}
          disabled={busyAction !== null}
          className="w-full px-3 py-2.5 text-left text-sm text-fluent-text hover:bg-primary-50 active:bg-primary-100 disabled:opacity-60 disabled:cursor-wait flex items-center gap-3 transition-colors"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void handleAction(item);
          }}
          title={item.label}
        >
          <span className="w-5 flex-shrink-0 text-base text-center">{item.icon}</span>
          <span className="min-w-0 whitespace-normal break-words leading-snug">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
