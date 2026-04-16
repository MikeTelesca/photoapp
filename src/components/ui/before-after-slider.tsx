"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface Props {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  /** Initial position 0–100. Defaults to 50. */
  initialPosition?: number;
  /** Aspect ratio class (tailwind) or inline style hook. Defaults to "aspect-[3/2]". */
  aspectClass?: string;
  /** Optional className for the outer wrapper */
  className?: string;
  /** Alt text for both images (A11y) */
  alt?: string;
}

/**
 * Before/after image slider with a cyan circular drag handle — the "Greseel" inspo pattern.
 * - Click or drag anywhere on the image to reposition the divider
 * - Keyboard: ← → arrows to nudge, Home/End to snap to edges
 * - Divider stays fixed when user stops interacting
 * - Shows small BEFORE / AFTER labels in corners
 */
export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
  initialPosition = 50,
  aspectClass = "aspect-[3/2]",
  className = "",
  alt = "Before and after comparison",
}: Props) {
  const [pos, setPos] = useState(initialPosition);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const update = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, x)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const x = "touches" in e ? e.touches[0]?.clientX : (e as MouseEvent).clientX;
      if (typeof x === "number") update(x);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, update]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPos((p) => Math.max(0, p - (e.shiftKey ? 10 : 2)));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPos((p) => Math.min(100, p + (e.shiftKey ? 10 : 2)));
    } else if (e.key === "Home") {
      e.preventDefault();
      setPos(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setPos(100);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative select-none overflow-hidden rounded-xl bg-graphite-900 ${aspectClass} ${className}`}
      onMouseDown={(e) => {
        setDragging(true);
        update(e.clientX);
      }}
      onTouchStart={(e) => {
        setDragging(true);
        if (e.touches[0]) update(e.touches[0].clientX);
      }}
    >
      {/* After (full-size, underneath) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={afterSrc}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
      />
      {/* Before (clipped to left of divider) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={beforeSrc}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      </div>

      {/* Labels */}
      <span className="absolute top-3 left-3 text-[10px] font-bold tracking-[0.18em] uppercase text-white/90 bg-black/40 backdrop-blur px-2 py-1 rounded">
        {beforeLabel}
      </span>
      <span className="absolute top-3 right-3 text-[10px] font-bold tracking-[0.18em] uppercase text-white/90 bg-black/40 backdrop-blur px-2 py-1 rounded">
        {afterLabel}
      </span>

      {/* Divider line */}
      <div
        className="absolute inset-y-0 w-0.5 bg-white/90 pointer-events-none"
        style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
        aria-hidden="true"
      />

      {/* Drag handle — cyan circle with chevrons */}
      <button
        type="button"
        role="slider"
        aria-label="Before/after comparison slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onMouseDown={(e) => {
          e.stopPropagation();
          setDragging(true);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          setDragging(true);
        }}
        className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-cyan shadow-lg shadow-cyan/30 border-2 border-white flex items-center justify-center cursor-ew-resize transition-transform ${
          dragging ? "scale-110" : "hover:scale-105"
        } focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-graphite-900`}
        style={{ left: `${pos}%` }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M6 4L2 9l4 5M12 4l4 5-4 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
