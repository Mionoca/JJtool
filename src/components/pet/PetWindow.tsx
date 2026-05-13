import { useEffect, useRef, useState } from "react";
import {
  currentMonitor,
  getCurrentWindow,
  monitorFromPoint,
  PhysicalPosition,
  PhysicalSize,
  type Monitor,
} from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { emitTo, listen } from "@tauri-apps/api/event";
import PetCharacter from "./PetCharacter";
import ChatBubble from "./ChatBubble";
import { usePetStore } from "@/stores/petStore";
import ReminderInput from "@/components/reminder/ReminderInput";
import ReminderPopup from "@/components/reminder/ReminderPopup";
import { useReminderStore } from "@/stores/reminderStore";
import type { Reminder } from "@/types/reminder";

const PET_WINDOW_SIZE = { width: 160, height: 200 };
const PET_CONTEXT_MENU_SIZE = { width: 320, height: 432 };
const DRAG_THRESHOLD_PX = 8;

function clampWindowPosition(
  position: PhysicalPosition,
  size: { width: number; height: number },
  monitor: Monitor | null
) {
  if (!monitor) return position;

  const workArea = monitor.workArea;
  const margin = 8;
  const minX = workArea.position.x + margin;
  const minY = workArea.position.y + margin;
  const maxX = workArea.position.x + workArea.size.width - size.width - margin;
  const maxY = workArea.position.y + workArea.size.height - size.height - margin;

  return new PhysicalPosition(
    Math.min(Math.max(position.x, minX), Math.max(minX, maxX)),
    Math.min(Math.max(position.y, minY), Math.max(minY, maxY))
  );
}

export default function PetWindow() {
  const { mood, message, setShowMenu, setMessage, setMood } = usePetStore();
  const { activeReminder, setActiveReminder } = useReminderStore();
  const [bouncing, setBouncing] = useState(false);
  const [showReminderInput, setShowReminderInput] = useState(false);
  const isDragging = useRef(false);
  const mouseDownPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    document.body.classList.add("pet-window");

    void getCurrentWindow().setSize(
      new PhysicalSize(PET_WINDOW_SIZE.width, PET_WINDOW_SIZE.height)
    );

    invoke<{ mood: string; message: string }>("get_pet_greeting").then(
      (result) => {
        setMood(result.mood as any);
        setMessage(result.message);
        setTimeout(() => setMessage(""), 8000);
      }
    );

    const unlisten = listen<Reminder>("reminder-triggered", (event) => {
      setActiveReminder(event.payload);
      setMood("happy" as any);
    });

    const unlistenHealth = listen<{ type: string; message: string }>(
      "health-reminder",
      (event) => {
        setMessage(event.payload.message);
        setMood("sleepy" as any);
        setTimeout(() => setMessage(""), 10000);
      }
    );

    return () => {
      unlisten.then((fn) => fn());
      unlistenHealth.then((fn) => fn());
    };
  }, []);

  const handleMouseDown = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    e.preventDefault();

    const win = getCurrentWindow();
    let startWindowPos: PhysicalPosition;
    try {
      startWindowPos = await win.outerPosition();
    } catch {
      return;
    }

    isDragging.current = false;
    mouseDownPos.current = { x: e.screenX, y: e.screenY };
    let hasDragged = false;

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.screenX - mouseDownPos.current.x;
      const dy = ev.screenY - mouseDownPos.current.y;

      if (
        !hasDragged &&
        Math.abs(dx) <= DRAG_THRESHOLD_PX &&
        Math.abs(dy) <= DRAG_THRESHOLD_PX
      ) {
        return;
      }

      hasDragged = true;
      isDragging.current = true;
      win
        .setPosition(new PhysicalPosition(startWindowPos.x + dx, startWindowPos.y + dy))
        .catch(() => {});
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (hasDragged) {
        isDragging.current = true;
        window.setTimeout(() => {
          isDragging.current = false;
        }, 0);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleClick = () => {
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }

    setBouncing(true);
    setTimeout(() => setBouncing(false), 400);

    if (!message && !showReminderInput) {
      invoke<{ mood: string; message: string }>("get_pet_greeting").then(
        (result) => {
          setMood(result.mood as any);
          setMessage(result.message);
          setTimeout(() => setMessage(""), 8000);
        }
      );
    }
  };

  const openPetContextMenu = async (e: React.MouseEvent) => {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const menuWindow = await WebviewWindow.getByLabel("pet-menu");
      if (!menuWindow) return;

      await menuWindow.setSize(
        new PhysicalSize(PET_CONTEXT_MENU_SIZE.width, PET_CONTEXT_MENU_SIZE.height)
      );

      await menuWindow.setPosition(new PhysicalPosition(e.screenX, e.screenY));

      const [pointMonitor, fallbackMonitor] = await Promise.all([
        monitorFromPoint(e.screenX, e.screenY).catch(() => null),
        currentMonitor().catch(() => null),
      ]);
      const clampedPosition = clampWindowPosition(
        new PhysicalPosition(e.screenX, e.screenY),
        PET_CONTEXT_MENU_SIZE,
        pointMonitor || fallbackMonitor
      );

      await menuWindow.setPosition(clampedPosition);
      await menuWindow.show();
      await menuWindow.setFocus();
      await emitTo("pet-menu", "pet-context-menu-opened", {
        x: clampedPosition.x,
        y: clampedPosition.y,
      });
    } catch (error) {
      console.error("Failed to open pet context menu:", error);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowReminderInput(false);
    setShowMenu(false);
    void openPetContextMenu(e);
  };

  return (
    <div
      className="relative select-none"
      style={{
        width: PET_WINDOW_SIZE.width,
        height: PET_WINDOW_SIZE.height,
      }}
    >
      {message && !showReminderInput && !activeReminder && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 w-64">
          <ChatBubble message={message} />
        </div>
      )}

      {showReminderInput && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 w-72">
          <ReminderInput onClose={() => setShowReminderInput(false)} />
        </div>
      )}

      {activeReminder && !showReminderInput && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 w-72">
          <ReminderPopup reminder={activeReminder} />
        </div>
      )}

      <div
        className="cursor-pointer"
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <div className={bouncing ? "animate-pet-bounce" : "animate-pet-idle"}>
          <PetCharacter mood={mood} />
        </div>
      </div>
    </div>
  );
}
