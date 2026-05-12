import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useTauriCommand<T>(commandName: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (args?: Record<string, unknown>) => {
      setLoading(true);
      setError(null);
      try {
        const result = await invoke<T>(commandName, args);
        setData(result);
        return result;
      } catch (e) {
        const msg = String(e);
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [commandName]
  );

  return { data, loading, error, execute };
}
