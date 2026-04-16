"use client";
import { useState, useEffect } from "react";

interface Props {
  jobId: string;
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `~${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `~${hours}h ${remMins}m`;
}

export function EtaBadge({ jobId }: Props) {
  const [eta, setEta] = useState<{
    etaSeconds: number;
    remaining: number;
    perPhotoSeconds: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/eta`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setEta(data);
      } catch (err) {
        // silently fail if endpoint errors
      }
    }

    load();
    const timer = setInterval(load, 30000); // refresh every 30 seconds

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [jobId]);

  if (!eta || eta.remaining === 0) return null;

  return (
    <span className="text-[10px] text-amber-600 dark:text-amber-400 whitespace-nowrap">
      ETA {formatEta(eta.etaSeconds)}
    </span>
  );
}
