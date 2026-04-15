"use client";

import { useEffect, useState } from "react";

interface JobColorPaletteProps {
  jobId: string;
}

export function JobColorPalette({ jobId }: JobColorPaletteProps) {
  const [palette, setPalette] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/jobs/${jobId}/color-palette`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setPalette(Array.isArray(data.palette) ? data.palette : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (loading) {
    return (
      <div
        className="flex items-center gap-1"
        title="Analyzing color palette..."
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-sm bg-graphite-200 dark:bg-graphite-700 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error || !palette || palette.length === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-1"
      title={`Color palette: ${palette.join(", ")}`}
    >
      <span className="text-[10px] uppercase tracking-wide text-graphite-500 dark:text-graphite-400 mr-1">
        Palette
      </span>
      {palette.map((hex, i) => (
        <div
          key={`${hex}-${i}`}
          className="w-4 h-4 rounded-sm border border-graphite-200 dark:border-graphite-700 cursor-help transition-transform hover:scale-125"
          style={{ backgroundColor: hex }}
          title={hex}
          aria-label={`Color ${hex}`}
        />
      ))}
    </div>
  );
}
