import { useState, useEffect, useRef, useCallback } from "react";

interface Props {
  durationMinutes?: number;
  onComplete?: () => void;
}

export default function PomodoroTimer({ durationMinutes = 25, onComplete }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const breakDuration = 5 * 60;

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            stopTimer();
            if (!isBreak) {
              onComplete?.();
              setIsBreak(true);
              setSecondsLeft(breakDuration);
              setIsRunning(false);
            } else {
              setIsBreak(false);
              setSecondsLeft(durationMinutes * 60);
              setIsRunning(false);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      stopTimer();
    }
    return stopTimer;
  }, [isRunning, isBreak]);

  const toggle = () => setIsRunning(!isRunning);

  const reset = () => {
    stopTimer();
    setIsRunning(false);
    setIsBreak(false);
    setSecondsLeft(durationMinutes * 60);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/30 border border-white/20">
      <div className="text-xs text-fluent-muted font-medium">
        {isBreak ? "休息时间" : "专注时间"}
      </div>
      <div className="text-3xl font-mono font-bold text-fluent-text">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </div>
      <div className="flex gap-2">
        <button
          onClick={toggle}
          className="px-3 py-1 text-xs rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
        >
          {isRunning ? "暂停" : "开始"}
        </button>
        <button
          onClick={reset}
          className="px-3 py-1 text-xs rounded-lg bg-white/50 text-fluent-text hover:bg-white/70 transition-colors"
        >
          重置
        </button>
      </div>
    </div>
  );
}
