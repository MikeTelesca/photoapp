"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronRightIcon, ChevronLeftIcon } from "@heroicons/react/24/outline";

interface MinimapPhoto {
  id: string;
  status: string;
  flagged?: boolean;
  favorited?: boolean;
  isFavorite?: boolean;
}

interface PhotoMinimapProps {
  photos: MinimapPhoto[];
  activeIndex: number;
  jumpTo: (index: number) => void;
}

const STORAGE_KEY = "ath-minimap-collapsed";

function dotColorClass(photo: MinimapPhoto): string {
  if (photo.status === "approved") return "bg-emerald-500";
  if (photo.status === "rejected") return "bg-red-500";
  if (photo.flagged) return "bg-amber-500";
  return "bg-graphite-400 dark:bg-graphite-500";
}

export function PhotoMinimap({ photos, activeIndex, jumpTo }: PhotoMinimapProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        setCollapsed(raw === "true");
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed, hydrated]);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  if (photos.length < 10) return null;

  return (
    <div
      className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex items-center pointer-events-none"
      aria-label="Photo overview minimap"
    >
      {/* Toggle arrow */}
      <button
        onClick={toggle}
        className="pointer-events-auto bg-white/90 dark:bg-graphite-800/90 backdrop-blur border border-graphite-200 dark:border-graphite-700 rounded-l-md px-1 py-3 shadow hover:bg-graphite-50 dark:hover:bg-graphite-700 transition-colors"
        aria-label={collapsed ? "Expand minimap" : "Collapse minimap"}
        title={collapsed ? "Expand minimap" : "Collapse minimap"}
      >
        {collapsed ? (
          <ChevronLeftIcon className="w-3 h-3 text-graphite-600 dark:text-graphite-300" />
        ) : (
          <ChevronRightIcon className="w-3 h-3 text-graphite-600 dark:text-graphite-300" />
        )}
      </button>

      {/* Dot stack */}
      {!collapsed && (
        <div
          className="pointer-events-auto bg-white/90 dark:bg-graphite-800/90 backdrop-blur border border-graphite-200 dark:border-graphite-700 border-r-0 rounded-l-md shadow py-2 px-1.5 flex flex-col items-center gap-[2px] max-h-[70vh] overflow-y-auto"
          style={{ scrollbarWidth: "thin" }}
        >
          {photos.map((photo, idx) => {
            const isActive = idx === activeIndex;
            const isFav = photo.favorited || photo.isFavorite;
            return (
              <button
                key={photo.id}
                onClick={() => jumpTo(idx)}
                className="group relative flex items-center justify-center"
                style={{ width: 10, height: 8 }}
                aria-label={`Photo ${idx + 1}${isActive ? " (current)" : ""}`}
                title={`Photo ${idx + 1}`}
              >
                <span
                  className={`block rounded-full transition-transform ${dotColorClass(
                    photo
                  )} ${isActive ? "ring-2 ring-cyan ring-offset-1 ring-offset-white dark:ring-offset-graphite-800 scale-125" : ""} ${
                    isFav && !isActive
                      ? "ring-1 ring-amber-400 ring-offset-1 ring-offset-white dark:ring-offset-graphite-800"
                      : ""
                  }`}
                  style={{ width: 4, height: 4 }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PhotoMinimap;
