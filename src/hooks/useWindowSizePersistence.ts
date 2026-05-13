import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, PhysicalSize } from "@tauri-apps/api/window";

type WindowSize = {
  width: number;
  height: number;
};

export function useWindowSizePersistence(label: string, defaultSize: WindowSize) {
  useEffect(() => {
    const win = getCurrentWindow();
    const settingKey = `window_size_${label}`;
    let saveTimer: number | undefined;

    const restoreSize = async () => {
      try {
        const raw = await invoke<string | null>("get_setting", { key: settingKey });
        const parsed = raw ? JSON.parse(raw) : defaultSize;
        if (
          typeof parsed.width === "number" &&
          typeof parsed.height === "number" &&
          parsed.width > 0 &&
          parsed.height > 0
        ) {
          await win.setSize(new PhysicalSize(parsed.width, parsed.height));
        }
      } catch {
        await win.setSize(new PhysicalSize(defaultSize.width, defaultSize.height));
      }
    };

    void restoreSize();

    const unlisten = win.onResized(({ payload }) => {
      if (saveTimer) {
        window.clearTimeout(saveTimer);
      }
      saveTimer = window.setTimeout(() => {
        void invoke("set_setting", {
          key: settingKey,
          value: JSON.stringify({ width: payload.width, height: payload.height }),
        });
      }, 300);
    });

    return () => {
      if (saveTimer) {
        window.clearTimeout(saveTimer);
      }
      unlisten.then((fn) => fn());
    };
  }, [defaultSize.height, defaultSize.width, label]);
}
