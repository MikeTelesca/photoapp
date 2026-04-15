"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  beforeUrl: string;
  afterUrl: string | null;
  isLoading?: boolean;
  loadingText?: string;
}

export function BeforeAfterSlider({ beforeUrl, afterUrl, isLoading, loadingText }: Props) {
  const [position, setPosition] = useState(50); // percentage
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
      setPosition(pct);
    }
    function handleTouchMove(e: TouchEvent) {
      if (!isDragging.current || !containerRef.current) return;
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
      setPosition(pct);
    }
    function handleMouseUp() {
      isDragging.current = false;
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, []);

  if (!afterUrl && !isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-graphite-800">
        <img src={beforeUrl} alt="Before" className="max-w-full max-h-full object-contain" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-graphite-800 text-graphite-400 text-sm">
        {loadingText || "Loading..."}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-graphite-900 cursor-ew-resize select-none"
      onMouseDown={() => (isDragging.current = true)}
      onTouchStart={() => (isDragging.current = true)}
    >
      {/* AFTER image (full width, base layer) */}
      <img
        src={afterUrl!}
        alt="After"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
      {/* BEFORE image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={beforeUrl}
          alt="Before"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>
      {/* Divider line + handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-graphite-700">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l-4 5 4 5M16 7l4 5-4 5" />
          </svg>
        </div>
      </div>
      {/* Labels */}
      <div className="absolute top-2.5 left-2.5 bg-black/50 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded backdrop-blur-sm">
        Before
      </div>
      <div className="absolute top-2.5 right-2.5 bg-black/50 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded backdrop-blur-sm">
        After
      </div>
    </div>
  );
}
