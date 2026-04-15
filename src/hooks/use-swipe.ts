"use client";
import { useRef } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export function useSwipe(handlers: SwipeHandlers) {
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const threshold = handlers.threshold ?? 50;

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!startRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startRef.current.x;
    const dy = t.clientY - startRef.current.y;
    const dt = Date.now() - startRef.current.t;
    startRef.current = null;

    // Ignore long touches (probably scroll) or small movements
    if (dt > 800) return;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    // Determine dominant axis
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) handlers.onSwipeRight?.();
      else handlers.onSwipeLeft?.();
    } else {
      if (dy > 0) handlers.onSwipeDown?.();
      else handlers.onSwipeUp?.();
    }
  }

  return { onTouchStart, onTouchEnd };
}
