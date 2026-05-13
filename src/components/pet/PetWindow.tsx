import { useEffect, useState, useRef, useCallback } from "react";
import { getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";
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

export default function PetWindow() {
  const { mood, message, showMenu, setShowMenu, setMessage, setMood } =
    usePetStore();
  const { activeReminder, setActiveReminder } = useReminderStore();
  const [bouncing, setBouncing] = useState(false);
  const [showReminderInput, setShowReminderInput] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [showStudy, setShowStudy] = useState(false);
  const isDragging = useRef(false);
  const dragStartScreen = useRef({ x: 0, y: 0 });
  const windowStartPos = useRef({ x: 0, y: 0 });

  // Make window click-through by default, only capture on pet hover
  const setClickThrough = useCallback(async (ignore: boolean) => {
    try {
      await getCurrentWindow().setIgnoreCursorEvents(ignore);
    } catch {
      // ignore if not supported
    }
  }, []);

  useEffect(() => {
    document.body.classList.add("pet-window");

    // Make window click-through on mount
    setClickThrough(true);

    // Ensure window is positioned correctly (fix for transparent windows)
    getCurrentWindow()
      .outerPosition()
      .then((pos) => {
        // If at (0,0), move to configured position
        if (pos.x === 0 && pos.y === 0) {
          getCurrentWindow().setPosition(new PhysicalPosition(1200, 600));
        }
      })
      .catch(() => {});

    // Load initial greeting
    invoke<{ mood: string; message: string }>("get_pet_greeting").then(
      (result) => {
        setMood(result.mood as any);
        setMessage(result.message);
        setTimeout(() => setMessage(""), 8000);
      }
    );

    // Listen for reminder triggers from Rust backend
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

  const handlePetMouseEnter = () => {
    // When hovering over pet, capture clicks so we can interact
    setClickThrough(false);
  };

  const handlePetMouseLeave = () => {
    // When leaving pet area, make click-through again
    if (!isDragging.current) {
      setClickThrough(true);
    }
  };

  const handleMouseDown = async (e: React.MouseEvent) => {
    if (e.button === 0) {
      isDragging.current = false;
      dragStartScreen.current = { x: e.screenX, y: e.screenY };

      try {
        const pos = await getCurrentWindow().outerPosition();
        windowStartPos.current = { x: pos.x, y: pos.y };
      } catch {
        return;
      }

      const handleMouseMove = (ev: MouseEvent) => {
        const dx = Math.abs(ev.screenX - dragStartScreen.current.x);
        const dy = Math.abs(ev.screenY - dragStartScreen.current.y);
        if (dx > 3 || dy > 3) {
          isDragging.current = true;
        }
        if (isDragging.current) {
          const newX =
            windowStartPos.current.x + (ev.screenX - dragStartScreen.current.x);
          const newY =
            windowStartPos.current.y + (ev.screenY - dragStartScreen.current.y);
          getCurrentWindow()
            .setPosition(new PhysicalPosition(newX, newY))
            .catch(() => {});
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        if (!isDragging.current) {
          // Re-enable click-through after a short delay
          setTimeout(() => setClickThrough(true), 100);
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
  };

  const handleClick = () => {
    if (isDragging.current) {
      isDragging.current = false;
      setClickThrough(true);
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
    setShowMenu(!showMenu);
  };

  const handleMenuAction = (action: string) => {
    setShowMenu(false);
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
    <div className="relative select-none" style={{ width: 160, height: 200 }}>
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

      {/* Pet character - only this area captures mouse events */}
      <div
        className="cursor-pointer"
        onMouseEnter={handlePetMouseEnter}
        onMouseLeave={handlePetMouseLeave}
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
          className="absolute top-0 right-0 translate-x-full z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <PetMenu onClose={() => setShowMenu(false)} onAction={handleMenuAction} />
        </div>
      )}
    </div>
  );
}
