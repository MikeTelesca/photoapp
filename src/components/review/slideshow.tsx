"use client";
import { useEffect, useState, useCallback } from "react";

interface Photo {
  id: string;
  editedUrl?: string | null;
  originalUrl?: string | null;
}

interface Props {
  photos: Photo[];
  initialIndex?: number;
  onClose: () => void;
}

export function Slideshow({ photos, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const next = useCallback(() => {
    setIndex(i => (i + 1) % photos.length);
  }, [photos.length]);

  const prev = useCallback(() => {
    setIndex(i => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [paused, next]);

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); }
      else if (e.key === " ") { e.preventDefault(); setPaused(p => !p); }
      else if (e.key === "ArrowRight") { next(); }
      else if (e.key === "ArrowLeft") { prev(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  // Auto-hide controls after inactivity
  useEffect(() => {
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [index, showControls]);

  function handleMouseMove() {
    setShowControls(true);
  }

  const photo = photos[index];
  if (!photo) return null;
  const src = photo.editedUrl || photo.originalUrl || "";

  return (
    <div
      onMouseMove={handleMouseMove}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
    >
      <img
        src={src}
        alt=""
        className="max-w-full max-h-full object-contain transition-opacity duration-300"
      />

      {showControls && (
        <>
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center text-white bg-gradient-to-b from-black/60 to-transparent">
            <div className="text-sm font-mono">{index + 1} / {photos.length}</div>
            <button onClick={onClose} className="text-sm px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
              Exit (Esc)
            </button>
          </div>

          {/* Prev/Next buttons */}
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 text-white text-2xl"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 text-white text-2xl"
          >
            ›
          </button>

          {/* Bottom bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center items-center gap-3 text-white bg-gradient-to-t from-black/60 to-transparent">
            <button
              onClick={() => setPaused(p => !p)}
              className="text-sm px-4 py-1.5 rounded bg-white/10 hover:bg-white/20"
            >
              {paused ? "▶ Play" : "⏸ Pause"}
            </button>
            <div className="text-xs text-white/60">Space to pause · ← → to navigate · Esc to exit</div>
          </div>
        </>
      )}

      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 h-0.5 bg-cyan"
        style={{
          width: `${((index + 1) / photos.length) * 100}%`,
          transition: "width 0.3s"
        }}
      />
    </div>
  );
}
