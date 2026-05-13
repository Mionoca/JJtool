import { useEffect } from "react";
import {
  currentMonitor,
  getCurrentWindow,
  PhysicalPosition,
  type Monitor,
} from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import PetMenu from "./PetMenu";

const MENU_SIZE = { width: 320, height: 432 };

function clampMenuPosition(position: PhysicalPosition, monitor: Monitor | null) {
  if (!monitor) return position;

  const workArea = monitor.workArea;
  const margin = 8;
  const minX = workArea.position.x + margin;
  const minY = workArea.position.y + margin;
  const maxX = workArea.position.x + workArea.size.width - MENU_SIZE.width - margin;
  const maxY = workArea.position.y + workArea.size.height - MENU_SIZE.height - margin;

  return new PhysicalPosition(
    Math.min(Math.max(position.x, minX), Math.max(minX, maxX)),
    Math.min(Math.max(position.y, minY), Math.max(minY, maxY))
  );
}

export default function PetContextMenu() {
  useEffect(() => {
    document.body.classList.add("pet-menu-window");
    const win = getCurrentWindow();

    const clampCurrentWindow = async () => {
      const [position, monitor] = await Promise.all([
        win.outerPosition().catch(() => null),
        currentMonitor().catch(() => null),
      ]);

      if (position) {
        await win.setPosition(clampMenuPosition(position, monitor));
      }
    };

    void clampCurrentWindow();

    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void win.hide();
      }
    };
    window.addEventListener("keydown", keyHandler);

    const unlistenFocus = win.onFocusChanged(({ payload }) => {
      if (!payload) {
        void win.hide();
      }
    });
    const unlistenOpen = listen("pet-context-menu-opened", () => {
      void clampCurrentWindow();
    });

    return () => {
      window.removeEventListener("keydown", keyHandler);
      unlistenFocus.then((fn) => fn());
      unlistenOpen.then((fn) => fn());
    };
  }, []);

  const closeMenu = () => {
    void getCurrentWindow().hide();
  };

  return (
    <div
      className="pet-context-menu"
      style={{
        position: "fixed",
        zIndex: 999999,
        left: 8,
        top: 8,
        minWidth: 240,
        maxWidth: 360,
        maxHeight: "calc(100vh - 32px)",
        overflowY: "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <PetMenu onClose={closeMenu} />
    </div>
  );
}
