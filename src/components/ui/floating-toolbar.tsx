"use client";

import { ReactNode } from "react";

/**
 * Floating pill toolbar — matches the "Greseel" photo editor inspo.
 * Use at the bottom of an image canvas / preview area to consolidate
 * zoom, undo/redo, rotate, and similar actions into one dark rounded-full
 * pill that floats above the content.
 *
 * Example:
 *   <FloatingToolbar>
 *     <ToolbarButton onClick={zoomOut} aria-label="Zoom out">−</ToolbarButton>
 *     <ToolbarSeparator />
 *     <ToolbarButton onClick={zoomReset}>100%</ToolbarButton>
 *     <ToolbarSeparator />
 *     <ToolbarButton onClick={zoomIn} aria-label="Zoom in">+</ToolbarButton>
 *     <ToolbarDivider />
 *     <ToolbarText>1600×1200px</ToolbarText>
 *     <ToolbarDivider />
 *     <ToolbarButton onClick={undo} aria-label="Undo">↶</ToolbarButton>
 *     <ToolbarButton onClick={redo} aria-label="Redo">↷</ToolbarButton>
 *   </FloatingToolbar>
 */
export function FloatingToolbar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-full bg-graphite-900/90 dark:bg-graphite-800/90 backdrop-blur-md border border-graphite-700/50 shadow-xl shadow-black/30 px-1.5 py-1 ${className}`}
      role="toolbar"
    >
      {children}
    </div>
  );
}

export function ToolbarButton({
  children,
  onClick,
  disabled,
  active,
  ariaLabel,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  ariaLabel?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active}
      title={title}
      className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-cyan text-white"
          : "text-white/80 hover:text-white hover:bg-white/10"
      } disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan`}
    >
      {children}
    </button>
  );
}

export function ToolbarText({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 text-[11px] tabular-nums text-white/60">
      {children}
    </span>
  );
}

export function ToolbarDivider() {
  return <span className="w-px h-4 bg-white/15 mx-1" aria-hidden="true" />;
}

/** Small gap between grouped buttons (not a divider) */
export function ToolbarSeparator() {
  return <span className="w-0.5" aria-hidden="true" />;
}
