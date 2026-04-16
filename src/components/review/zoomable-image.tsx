"use client";

import { useState, useRef, useEffect, MouseEvent, WheelEvent } from "react";

interface Props {
  src: string;
  alt: string;
  zoom: number;
  pan: { x: number; y: number };
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  className?: string;
}

export function ZoomableImage({ src, alt, zoom, pan, onZoomChange, onPanChange, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);

  function handleMouseDown(e: MouseEvent) {
    if (zoom === 1) return;
    isDragging.current = true;
    didDrag.current = false;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDrag.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    onPanChange({ x: pan.x + dx, y: pan.y + dy });
  }

  function handleMouseUp() {
    isDragging.current = false;
  }

  function handleWheel(e: WheelEvent) {
    // Only zoom when pinch-zooming (ctrlKey) or holding Cmd/Ctrl.
    // Plain mouse wheel = let the page scroll normally.
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    const newZoom = Math.min(8, Math.max(1, zoom + delta));
    onZoomChange(newZoom);
    if (newZoom === 1) onPanChange({ x: 0, y: 0 });
  }

  function handleClick() {
    if (didDrag.current) return;
    // Cycle zoom: 1 → 2 → 4 → 1
    const next = zoom === 1 ? 2 : zoom === 2 ? 4 : 1;
    onZoomChange(next);
    if (next === 1) onPanChange({ x: 0, y: 0 });
  }

  useEffect(() => {
    const onUp = () => { isDragging.current = false; };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-graphite-950 ${zoom > 1 ? "cursor-grab" : "cursor-zoom-in"} ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="absolute top-1/2 left-1/2 transition-transform duration-100 ease-out select-none"
        style={{
          // Fit the whole image inside the viewport. No auto-crop.
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
          transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
}
