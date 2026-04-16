"use client";

import { ReactNode } from "react";

/**
 * Vertical icon-only rail — matches the "Greseel" photo editor inspo.
 * A narrow pill-rounded dark container for a stack of mode icons.
 * Active icon = cyan filled circle. Inactive = muted graphite.
 *
 * Intended for use inside editors / canvas views (review gallery)
 * as a secondary nav alongside the TopNav.
 */
export function IconRail({
  children,
  className = "",
  ariaLabel = "Tools",
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      className={`inline-flex flex-col items-center gap-1 rounded-2xl bg-graphite-100 dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-800 p-1.5 ${className}`}
      role="toolbar"
      aria-orientation="vertical"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

export function IconRailButton({
  icon,
  label,
  active,
  onClick,
  href,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const cls = `inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan ${
    active
      ? "bg-cyan text-white shadow-lg shadow-cyan/30"
      : "text-graphite-500 dark:text-graphite-400 hover:bg-graphite-200 dark:hover:bg-graphite-800 hover:text-graphite-900 dark:hover:text-white"
  }`;
  if (href) {
    return (
      <a href={href} aria-label={label} title={label} aria-current={active ? "page" : undefined} className={cls}>
        {icon}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cls}
    >
      {icon}
    </button>
  );
}
