import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useClipboardStore } from "@/stores/clipboardStore";
import type { ClipboardItem } from "@/types/clipboard";

export function useClipboardListener() {
  const addItem = useClipboardStore((s) => s.addItem);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<ClipboardItem>("clipboard-changed", (event) => {
      addItem(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [addItem]);
}
