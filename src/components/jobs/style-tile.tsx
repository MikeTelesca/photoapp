"use client";

import { ReactNode } from "react";

// Small reusable building blocks for the style picker UI (new-job form AND
// per-photo settings modal). Keeps each picker host under 400 lines.

export function StyleTile({
  label,
  selected,
  onClick,
  aspect,
  children,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  aspect: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col gap-1.5 rounded-xl p-0.5 transition-all ${
        selected
          ? "ring-2 ring-cyan scale-[1.02] shadow-lg shadow-cyan/15"
          : "ring-1 ring-graphite-800 hover:ring-graphite-600"
      }`}
    >
      <div className={`relative w-full ${aspect} rounded-[10px] overflow-hidden`}>
        {children}
        {selected && <Checkmark />}
      </div>
      <span
        className={`text-[11px] font-medium pb-0.5 text-center leading-tight truncate ${
          selected ? "text-cyan" : "text-graphite-400 group-hover:text-white"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

// "Inherit from job" tile — dashed outline + grey "Default" badge.
export function InheritTile({
  selected,
  onClick,
  defaultLabel,
  compact,
}: {
  selected: boolean;
  onClick: () => void;
  defaultLabel: string;
  compact?: boolean;
}) {
  const aspect = compact ? "aspect-square" : "aspect-[4/3]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col gap-1.5 rounded-xl p-0.5 transition-all ${
        selected
          ? "ring-2 ring-cyan scale-[1.02] shadow-lg shadow-cyan/15"
          : "ring-1 ring-graphite-800 hover:ring-graphite-600"
      }`}
    >
      <div
        className={`relative w-full ${aspect} rounded-[10px] overflow-hidden border border-dashed border-graphite-700 bg-graphite-950 flex items-center justify-center`}
      >
        <span className="text-[9px] uppercase tracking-[0.25em] text-graphite-500 font-semibold">
          Default
        </span>
        {selected && <Checkmark />}
      </div>
      <span
        className={`text-[10px] font-medium pb-0.5 text-center leading-tight truncate ${
          selected ? "text-cyan" : "text-graphite-500 group-hover:text-white"
        }`}
        title={defaultLabel}
      >
        {defaultLabel}
      </span>
    </button>
  );
}

export function TileSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-graphite-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Checkmark() {
  return (
    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-cyan flex items-center justify-center">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path
          d="M2 5.5L4 7.5L8 3"
          stroke="#0a0a0b"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function fallbackGradient(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hue1 = hash % 360;
  const hue2 = (hue1 + 45) % 360;
  const hue3 = (hue1 + 180) % 360;
  return `linear-gradient(135deg, hsl(${hue1} 55% 22%), hsl(${hue2} 55% 42%), hsl(${hue3} 70% 72%))`;
}
