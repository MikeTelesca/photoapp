"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  jobId: string;
  initialSeconds?: number;
}

function format(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TimeTracker({ jobId, initialSeconds = 0 }: Props) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // session elapsed
  const [total, setTotal] = useState(initialSeconds); // including this session
  const startRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsed * 1000;
      intervalRef.current = setInterval(() => {
        const e = Math.floor((Date.now() - startRef.current) / 1000);
        setElapsed(e);
        setTotal(initialSeconds + e);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, initialSeconds, elapsed]);

  async function stop() {
    setRunning(false);
    if (elapsed > 0) {
      await fetch(`/api/jobs/${jobId}/track-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds: elapsed }),
      });
      setElapsed(0);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button onClick={() => running ? stop() : setRunning(true)}
        className={`text-xs px-3 py-1 rounded font-semibold ${
          running
            ? "bg-red-500 text-white"
            : "border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300"
        }`}
        title={running ? "Stop and save" : "Start tracking time"}>
        {running ? "⏸ Stop" : "▶ Track time"}
      </button>
      <span className="text-xs font-mono text-graphite-500 dark:text-graphite-400">
        {format(total)}
      </span>
    </div>
  );
}
