import { getCurrentWindow } from "@tauri-apps/api/window";

interface Props {
  onClose: () => void;
  onAction?: (action: string) => void;
}

const menuItems = [
  { id: "clipboard", icon: "📋", label: "剪贴板历史" },
  { id: "reminder", icon: "⏰", label: "添加提醒" },
  { id: "sticky", icon: "📝", label: "便签" },
  { id: "settings", icon: "⚙️", label: "设置" },
  { id: "separator", icon: "", label: "" },
  { id: "hide", icon: "👁️", label: "隐藏桌宠" },
  { id: "quit", icon: "🚪", label: "退出" },
];

export default function PetMenu({ onClose, onAction }: Props) {
  const handleAction = async (id: string) => {
    onClose();

    // Notify parent of the action
    onAction?.(id);

    switch (id) {
      case "clipboard": {
        try {
          const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
          const existing = await WebviewWindow.getByLabel("clipboard");
          if (existing) {
            const visible = await existing.isVisible();
            if (visible) {
              await existing.hide();
            } else {
              await existing.show();
              await existing.setFocus();
            }
          }
        } catch (e) {
          console.error("Failed to toggle clipboard window:", e);
        }
        break;
      }
      case "sticky": {
        try {
          const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
          const existing = await WebviewWindow.getByLabel("sticky");
          if (existing) {
            const visible = await existing.isVisible();
            if (visible) {
              await existing.hide();
            } else {
              await existing.show();
              await existing.setFocus();
            }
          }
        } catch (e) {
          console.error("Failed to toggle sticky window:", e);
        }
        break;
      }
      case "settings": {
        try {
          const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
          const existing = await WebviewWindow.getByLabel("settings");
          if (existing) {
            await existing.show();
            await existing.setFocus();
          }
        } catch (e) {
          console.error("Failed to open settings:", e);
        }
        break;
      }
      case "hide":
        await getCurrentWindow().hide();
        break;
      case "quit":
        await getCurrentWindow().close();
        break;
    }
  };

  return (
    <div
      className="glass rounded-fluent shadow-fluent py-1 min-w-[140px] animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item) =>
        item.id === "separator" ? (
          <div key="sep" className="h-px bg-fluent-border my-1" />
        ) : (
          <button
            key={item.id}
            className="w-full px-3 py-2 text-left text-sm text-fluent-text hover:bg-primary-50 flex items-center gap-2 transition-colors"
            onClick={() => handleAction(item.id)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      )}
    </div>
  );
}
