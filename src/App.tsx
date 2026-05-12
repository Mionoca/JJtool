import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import PetWindow from "@/components/pet/PetWindow";
import ClipboardPanel from "@/components/clipboard/ClipboardPanel";
import StickySidebar from "@/components/sticky/StickySidebar";
import SettingsWindow from "@/components/settings/SettingsWindow";

function App() {
  const [windowLabel, setWindowLabel] = useState<string>("");

  useEffect(() => {
    const win = getCurrentWindow();
    setWindowLabel(win.label);

    // Register global shortcut only once in main window
    if (win.label === "main") {
      registerGlobalShortcut();
    }
  }, []);

  // Route to correct component based on window label
  switch (windowLabel) {
    case "clipboard":
      return <ClipboardPanel />;
    case "sticky":
      return <StickySidebar />;
    case "settings":
      return <SettingsWindow />;
    case "main":
    default:
      return <PetWindow />;
  }
}

let shortcutRegistered = false;
let lastToggleTime = 0;

async function registerGlobalShortcut() {
  if (shortcutRegistered) return;
  shortcutRegistered = true;

  try {
    const { register } = await import("@tauri-apps/plugin-global-shortcut");
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");

    await register("CmdOrCtrl+Shift+V", async () => {
      // Debounce: ignore if toggled within 500ms
      const now = Date.now();
      if (now - lastToggleTime < 500) return;
      lastToggleTime = now;

      const clipWindow = await WebviewWindow.getByLabel("clipboard");
      if (clipWindow) {
        const visible = await clipWindow.isVisible();
        if (visible) {
          await clipWindow.hide();
        } else {
          await clipWindow.show();
          await clipWindow.setFocus();
        }
      }
    });
  } catch (e) {
    console.error("Failed to register global shortcut:", e);
  }
}

export default App;
