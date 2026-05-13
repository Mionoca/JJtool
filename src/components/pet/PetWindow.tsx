import { useEffect, useState, useRef } from "react";
import { getCurrentWindow, PhysicalPosition, PhysicalSize } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import PetCharacter from "./PetCharacter";
import ChatBubble from "./ChatBubble";
import PetMenu from "./PetMenu";
import { usePetStore } from "@/stores/petStore";
import ReminderInput from "@/components/reminder/ReminderInput";
import ReminderPopup from "@/components/reminder/ReminderPopup";
import { useReminderStore } from "@/stores/reminderStore";
import NewsPanel from "@/components/news/NewsPanel";
import StudyPanel from "@/components/study/StudyPanel";
import type { Reminder } from "@/types/reminder";

const PET_WINDOW_SIZE = { width: 160, height: 200 };
const MENU_WINDOW_SIZE = { width: 320, height: 360 };
const DRAG_THRESHOLD_PX = 8;

export default function PetWindow() {
  const { mood, message, showMenu, setShowMenu, setMessage, setMood } =
    usePetStore();
  const { activeReminder, setActiveReminder } = useReminderStore();
  const [bouncing, setBouncing] = useState(false);
  const [showReminderInput, setShowReminderInput] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [showStudy, setShowStudy] = useState(false);
  const isDragging = useRef(false);
  const mouseDownPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    document.body.classList.add("pet-window");

    // Load initial greeting
    invoke<{ mood: string; message: string }>("get_pet_greeting").then(
      (result) => {
        setMood(result.mood as any);
        setMessage(result.message);
        setTimeout(() => setMessage(""), 8000);
      }
    );

    // Listen for reminder triggers
    const unlisten = listen<Reminder>("reminder-triggered", (event) => {
      setActiveReminder(event.payload);
      setMood("happy" as any);
    });

    // Listen for health reminders
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

  const setPetWindowSize = async (size: typeof PET_WINDOW_SIZE) => {
    try {
      await getCurrentWindow().setSize(new PhysicalSize(size.width, size.height));
    } catch {
      // keep current size if the platform denies resize
    }
  };

  const closeMenu = () => {
    setShowMenu(false);
    setPetWindowSize(PET_WINDOW_SIZE);
  };

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
    // Ignore click if we just finished dragging
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showMenu) {
      closeMenu();
      return;
    }

    setShowNews(false);
    setShowStudy(false);
    setShowMenu(true);
    setPetWindowSize(MENU_WINDOW_SIZE);
  };

  const handleMenuAction = (action: string) => {
    closeMenu();
    setShowNews(false);
    setShowStudy(false);
    if (action === "reminder") {
      setShowReminderInput(true);
      setMessage("");
    } else if (action === "news") {
      setShowNews(true);
      setMessage("");
    } else if (action === "study") {
      setShowStudy(true);
      setMessage("");
    }
  };

  return (
    <div
      className="relative select-none"
      style={{
        width: showMenu ? MENU_WINDOW_SIZE.width : PET_WINDOW_SIZE.width,
        height: showMenu ? MENU_WINDOW_SIZE.height : PET_WINDOW_SIZE.height,
      }}
    >
      {/* Chat bubble */}
      {message && !showReminderInput && !activeReminder && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 w-64">
          <ChatBubble message={message} />
        </div>
      )}

      {/* Reminder input popup */}
      {showReminderInput && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 w-72">
          <ReminderInput onClose={() => setShowReminderInput(false)} />
        </div>
      )}

      {/* Active reminder popup */}
      {activeReminder && !showReminderInput && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 w-72">
          <ReminderPopup reminder={activeReminder} />
        </div>
      )}

      {/* News panel popup */}
      {showNews && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-30">
          <div className="relative">
            <button
              onClick={() => setShowNews(false)}
              className="absolute -top-1 -right-1 z-40 w-5 h-5 rounded-full bg-red-400 text-white text-xs flex items-center justify-center hover:bg-red-500"
            >
              ×
            </button>
            <NewsPanel />
          </div>
        </div>
      )}

      {/* Study panel popup */}
      {showStudy && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-30">
          <div className="relative">
            <button
              onClick={() => setShowStudy(false)}
              className="absolute -top-1 -right-1 z-40 w-5 h-5 rounded-full bg-red-400 text-white text-xs flex items-center justify-center hover:bg-red-500"
            >
              ×
            </button>
            <StudyPanel />
          </div>
        </div>
      )}

      {/* Pet character */}
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

      {/* Context menu */}
      {showMenu && (
        <div
          className="absolute left-[150px] top-2 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <PetMenu onClose={closeMenu} onAction={handleMenuAction} />
        </div>
      )}
    </div>
  );
}
