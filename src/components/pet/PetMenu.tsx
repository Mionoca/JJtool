import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";

interface Props {
  onClose: () => void;
}

type MenuItem = {
  id: string;
  icon: string;
  label: string;
  windowLabel?: string;
  event?: string;
};

const menuItems: MenuItem[] = [
  {
    id: "add-plan-reminder",
    icon: "📚",
    label: "添加计划 / 提醒",
    windowLabel: "study",
    event: "study-open-add-task",
  },
  {
    id: "view-plan-reminder",
    icon: "✅",
    label: "查看计划与提醒",
    windowLabel: "study",
  },
  {
    id: "add-sticky",
    icon: "📝",
    label: "添加便签",
    windowLabel: "sticky",
    event: "sticky-open-add-note",
  },
  { id: "sticky", icon: "🗒️", label: "打开便签栏", windowLabel: "sticky" },
  { id: "clipboard", icon: "📋", label: "查看剪贴板历史", windowLabel: "clipboard" },
  {
    id: "refresh-news",
    icon: "📰",
    label: "刷新资讯",
    windowLabel: "news",
    event: "news-refresh",
  },
  {
    id: "interests",
    icon: "🎯",
    label: "设置兴趣关键词",
    windowLabel: "settings",
    event: "settings-focus-interests",
  },
  { id: "settings", icon: "⚙️", label: "打开设置", windowLabel: "settings" },
  { id: "quit", icon: "⏻", label: "退出程序" },
];

export default function PetMenu({ onClose }: Props) {
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const openWindow = async (label: string, event?: string) => {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const existing = await WebviewWindow.getByLabel(label);
    if (!existing) return;

    await existing.show();
    await existing.setFocus();

    if (event) {
      await emitTo(label, event, { source: "pet-menu" });
    }
  };

  const handleAction = async (item: MenuItem) => {
    if (busyAction !== null) return;
    setBusyAction(item.id);
    onClose();

    try {
      if (item.windowLabel) {
        await openWindow(item.windowLabel, item.event);
      }

      if (item.id === "quit") {
        await invoke("quit_app");
      }
    } catch (e) {
      console.error(`Pet menu action failed: ${item.id}`, e);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div
      className="py-1 min-w-[240px] max-h-[calc(100vh-32px)] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {menuItems.map((item) => (
        <button
          key={item.id}
          disabled={busyAction !== null}
          className="pet-context-menu-item flex items-center gap-3 text-left text-sm text-fluent-text hover:bg-primary-50 active:bg-primary-100 disabled:opacity-60 disabled:cursor-wait transition-colors"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void handleAction(item);
          }}
          title={item.label}
        >
          <span className="w-5 flex-shrink-0 text-base text-center">{item.icon}</span>
          <span className="whitespace-nowrap leading-snug">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
