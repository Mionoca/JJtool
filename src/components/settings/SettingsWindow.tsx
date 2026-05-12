import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function SettingsWindow() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<Record<string, string>>("get_settings")
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = async (key: string, value: string) => {
    await invoke("set_setting", { key, value });
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const handleClose = () => {
    getCurrentWindow().hide();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <span className="text-fluent-muted">加载中...</span>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Title bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 drag-region">
        <h1 className="text-lg font-semibold text-fluent-text">⚙️ 设置</h1>
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center text-fluent-muted hover:text-fluent-text hover:bg-gray-200 rounded transition-colors no-drag"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* General section */}
        <section>
          <h2 className="text-sm font-semibold text-fluent-text mb-3">
            通用设置
          </h2>
          <div className="space-y-3">
            <SettingRow
              label="开机自启"
              description="系统启动时自动运行 JJtool"
            >
              <ToggleSwitch
                checked={settings.auto_start === "true"}
                onChange={(v) =>
                  updateSetting("auto_start", v ? "true" : "false")
                }
              />
            </SettingRow>
            <SettingRow
              label="快捷键"
              description="打开剪贴板面板的快捷键"
            >
              <span className="text-sm text-fluent-muted px-2 py-1 bg-gray-100 rounded font-mono">
                {settings.clipboard_hotkey || "Ctrl+Shift+V"}
              </span>
            </SettingRow>
          </div>
        </section>

        {/* Health section */}
        <section>
          <h2 className="text-sm font-semibold text-fluent-text mb-3">
            健康提醒
          </h2>
          <SettingRow
            label="提醒间隔"
            description="连续工作多久后提醒休息（分钟）"
          >
            <select
              value={settings.health_interval_min || "40"}
              onChange={(e) =>
                updateSetting("health_interval_min", e.target.value)
              }
              className="text-sm px-3 py-1.5 rounded-fluent border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300/50"
            >
              <option value="20">20 分钟</option>
              <option value="30">30 分钟</option>
              <option value="40">40 分钟</option>
              <option value="60">60 分钟</option>
              <option value="90">90 分钟</option>
            </select>
          </SettingRow>
        </section>

        {/* Data section */}
        <section>
          <h2 className="text-sm font-semibold text-fluent-text mb-3">
            数据管理
          </h2>
          <div className="bg-white rounded-fluent p-4 border border-gray-100">
            <p className="text-sm text-fluent-muted">
              数据存储位置: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">%APPDATA%/JJtool/jjtool.db</code>
            </p>
            <p className="text-xs text-fluent-muted mt-2">
              剪贴板记录保留 3 天后自动清除。收藏的记录不会被清除。
            </p>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-sm font-semibold text-fluent-text mb-3">
            关于
          </h2>
          <div className="bg-white rounded-fluent p-4 border border-gray-100">
            <p className="text-sm text-fluent-text font-medium">JJtool v0.1.0</p>
            <p className="text-xs text-fluent-muted mt-1">
              Windows AI 桌面助手 · 剪贴板管理 · 智能提醒
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between bg-white rounded-fluent px-4 py-3 border border-gray-100">
      <div>
        <p className="text-sm text-fluent-text">{label}</p>
        <p className="text-xs text-fluent-muted mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`
        relative w-10 h-5 rounded-full transition-colors duration-200
        ${checked ? "bg-primary-500" : "bg-gray-300"}
      `}
    >
      <div
        className={`
          absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
          ${checked ? "translate-x-5" : "translate-x-0.5"}
        `}
      />
    </button>
  );
}
