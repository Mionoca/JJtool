import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import CharacterPicker from "./CharacterPicker";

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
    void getCurrentWindow().hide();
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 drag-region">
        <h1 className="text-lg font-semibold text-fluent-text">设置</h1>
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center text-fluent-muted hover:text-fluent-text hover:bg-gray-200 rounded transition-colors no-drag"
          title="关闭"
        >
          x
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-fluent-text mb-3">通用设置</h2>
          <div className="space-y-3">
            <SettingRow
              label="开机自启"
              description="系统启动时自动运行 JJtool"
            >
              <ToggleSwitch
                checked={settings.auto_start === "true"}
                onChange={(v) => updateSetting("auto_start", v ? "true" : "false")}
              />
            </SettingRow>
            <SettingRow
              label="剪贴板快捷键"
              description="打开剪贴板历史窗口的全局快捷键"
            >
              <span className="text-sm text-fluent-muted px-2 py-1 bg-gray-100 rounded font-mono">
                {settings.clipboard_hotkey || "Ctrl+Shift+V"}
              </span>
            </SettingRow>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-fluent-text mb-3">资讯兴趣关键词</h2>
          <div className="bg-white rounded-fluent p-4 border border-gray-100">
            <label className="block text-sm text-fluent-text">
              设置兴趣关键词
              <textarea
                value={settings.news_keywords || "人工智能, OpenAI, 编程, 深度学习"}
                onChange={(e) => updateSetting("news_keywords", e.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-fluent border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-fluent-text focus:outline-none focus:ring-2 focus:ring-primary-300/50"
              />
            </label>
            <p className="text-xs text-fluent-muted mt-2">
              多个关键词用逗号分隔，刷新资讯时会优先匹配这些方向。
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-fluent-text mb-3">桌宠形象</h2>
          <div className="bg-white rounded-fluent p-4 border border-gray-100">
            <CharacterPicker />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-fluent-text mb-3">健康提醒</h2>
          <SettingRow
            label="提醒间隔"
            description="连续工作多久后提醒休息，单位为分钟"
          >
            <select
              value={settings.health_interval_min || "40"}
              onChange={(e) => updateSetting("health_interval_min", e.target.value)}
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

        <section>
          <h2 className="text-sm font-semibold text-fluent-text mb-3">数据管理</h2>
          <div className="bg-white rounded-fluent p-4 border border-gray-100">
            <p className="text-sm text-fluent-muted">
              数据存储位置：
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                %APPDATA%/JJtool/jjtool.db
              </code>
            </p>
            <p className="text-xs text-fluent-muted mt-2">
              剪贴板记录默认保留 3 天，收藏记录不会被自动清理。
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-fluent-text mb-3">关于</h2>
          <div className="bg-white rounded-fluent p-4 border border-gray-100">
            <p className="text-sm text-fluent-text font-medium">JJtool v0.1.0</p>
            <p className="text-xs text-fluent-muted mt-1">
              Windows AI 桌面助手，包含桌宠、剪贴板管理、智能提醒和资讯推送。
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
    <div className="flex items-center justify-between gap-4 bg-white rounded-fluent px-4 py-3 border border-gray-100">
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
      title={checked ? "已开启" : "已关闭"}
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
