"use client";
import { useEffect, useState } from "react";
import { playInboxSound } from "@/lib/sounds";

interface JobProgress {
  id: string;
  address: string;
  totalPhotos: number;
  processedPhotos: number;
  approvedPhotos: number;
  rejectedPhotos: number;
  status: string;
}

export function useJobProgress(): { jobs: JobProgress[]; connected: boolean } {
  const [jobs, setJobs] = useState<JobProgress[]>([]);
  const [connected, setConnected] = useState(false);
  const [prevJobIds, setPrevJobIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;

    let es: EventSource | null = null;
    let cancelled = false;
    let reconnectTimer: any = null;

    function connect() {
      if (cancelled) return;
      es = new EventSource("/api/jobs/progress/stream");

      es.onopen = () => setConnected(true);
      es.onerror = () => {
        setConnected(false);
        es?.close();
        // Reconnect after delay
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "init" || data.type === "update") {
            setJobs(data.jobs || []);
          }
        } catch {}
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, []);

  return { jobs, connected };
}
