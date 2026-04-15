"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";

/**
 * Compact ⋯ overflow menu for list rows. Children are rendered as menu items
 * inside a popover; each child should be a styled <button>/<a> that closes
 * the menu on its own click handler. The menu closes on outside click or ESC.
 */
export function RowOverflowMenu({
  children,
  ariaLabel = "More actions",
}: {
  children: ReactNode;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative inline-block"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-graphite-500 hover:text-graphite-900 dark:text-graphite-400 dark:hover:text-white hover:bg-graphite-100 dark:hover:bg-graphite-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <EllipsisHorizontalIcon className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className="absolute right-0 top-full mt-1 z-30 min-w-[12rem] rounded-md border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-900 shadow-lg py-1"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Standard menu-row styling so callers don't duplicate. Use for inline
 * content (children = label) and compose an onClick.
 */
export function RowOverflowItem({
  onClick,
  children,
  destructive = false,
  href,
}: {
  onClick?: (e: React.MouseEvent) => void;
  children: ReactNode;
  destructive?: boolean;
  href?: string;
}) {
  const cls = `block w-full text-left px-3 py-2 text-xs ${
    destructive
      ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
      : "text-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800"
  }`;
  if (href) {
    return (
      <a
        href={href}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        className={cls}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={cls}
    >
      {children}
    </button>
  );
}
