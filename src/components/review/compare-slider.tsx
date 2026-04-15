"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CompareSliderProps {
  beforeUrl: string;
  afterUrl: string;
  alt?: string;
}

/**
 * Interactive before/after split slider.
 *
 * Shows the "after" image as the base layer and overlays the "before" image
 * clipped via clip-path controlled by a draggable vertical divider. Supports
 * mouse and touch. Pure CSS/JS — no external dependencies.
 */
export function CompareSlider({ beforeUrl, afterUrl, alt = "Comparison" }: CompareSliderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const [position, setPosition] = useState(50); // percent 0..100

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    draggingRef.current = true;
    updateFromClientX(e.clientX);
  }, [updateFromClientX]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    draggingRef.current = true;
    if (e.touches[0]) updateFromClientX(e.touches[0].clientX);
  }, [updateFromClientX]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      updateFromClientX(e.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      if (e.touches[0]) updateFromClientX(e.touches[0].clientX);
    };
    const onUp = () => { draggingRef.current = false; };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onUp);
    window.addEventListener("touchcancel", onUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("touchcancel", onUp);
    };
  }, [updateFromClientX]);

  const clip = `inset(0 ${100 - position}% 0 0)`;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden bg-graphite-900 rounded-lg cursor-ew-resize"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* After (base) */}
      <img
        src={afterUrl}
        alt={`${alt} - after`}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
      {/* Before (clipped overlay) */}
      <img
        src={beforeUrl}
        alt={`${alt} - before`}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        style={{ clipPath: clip, WebkitClipPath: clip } as React.CSSProperties}
        draggable={false}
      />

      {/* Labels */}
      <div className="absolute top-2.5 left-2.5 bg-black/50 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded backdrop-blur-sm pointer-events-none">
        Before
      </div>
      <div className="absolute top-2.5 right-2.5 bg-black/50 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded backdrop-blur-sm pointer-events-none">
        After
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,0.6)] pointer-events-none"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      />

      {/* Handle */}
      <div
        className="absolute top-1/2 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center pointer-events-none"
        style={{ left: `${position}%`, transform: "translate(-50%, -50%)" }}
      >
        <span className="text-graphite-900 text-sm font-bold leading-none">⇔</span>
      </div>
    </div>
  );
}

export default CompareSlider;
