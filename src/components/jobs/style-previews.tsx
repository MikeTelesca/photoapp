// Visual previews for the new-job style pickers.
// Pure CSS gradients — no stock photography, no external images.
// Each preview is a square/rect tile rendered inside a parent with overflow hidden.

import { ReactNode } from "react";

type PreviewMap<K extends string> = Record<K, { label: string; render: () => ReactNode }>;

export type PresetKey = "standard" | "bright-airy" | "flambient-hdr";
export type TvKey = "netflix" | "black" | "beach" | "mountains" | "fireplace" | "art" | "off";
export type SkyKey = "blue-clouds" | "clear-blue" | "golden-hour" | "dramatic" | "overcast-soft" | "as-is";
export type SeasonalKey = "" | "spring" | "summer" | "autumn" | "winter" | "twilight";

export const presetPreviews: PreviewMap<PresetKey> = {
  standard: {
    label: "Standard",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-graphite-600 via-graphite-400 to-cyan-300/60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.35),transparent_55%)]" />
      </div>
    ),
  },
  "bright-airy": {
    label: "Bright & Airy",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-b from-white via-sky-50 to-amber-50">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-rose-100/40 to-sky-100/50" />
      </div>
    ),
  },
  "flambient-hdr": {
    label: "Flambient HDR",
    render: () => (
      // Warm window highlights + cool clean ambient + soft interior glow —
      // the flash-blended look without the gold-plated luxury vibe.
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-700 to-amber-200">
        <div className="absolute inset-x-0 top-0 h-[55%] bg-gradient-to-b from-sky-100/35 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_78%_72%,rgba(253,224,150,0.55),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_28%,rgba(255,255,255,0.28),transparent_45%)]" />
      </div>
    ),
  },
};

export const tvPreviews: PreviewMap<TvKey> = {
  netflix: {
    label: "Netflix",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-red-800 to-black flex items-center justify-center">
        <span className="text-red-500 text-3xl font-black tracking-tighter drop-shadow-[0_2px_8px_rgba(239,68,68,0.6)]">
          N
        </span>
      </div>
    ),
  },
  black: {
    label: "Black",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-graphite-900 via-black to-graphite-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04),transparent_60%)]" />
      </div>
    ),
  },
  beach: {
    label: "Beach",
    render: () => (
      <div className="absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[55%] bg-gradient-to-b from-cyan-300 to-sky-200" />
        <div className="absolute inset-x-0 top-[55%] h-[15%] bg-gradient-to-b from-sky-400 to-blue-500" />
        <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-b from-amber-200 to-amber-400" />
      </div>
    ),
  },
  mountains: {
    label: "Mountains",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-slate-300 to-slate-500">
        <svg className="absolute bottom-0 w-full h-[70%]" viewBox="0 0 100 50" preserveAspectRatio="none">
          <polygon points="0,50 18,15 32,28 48,8 62,22 78,12 92,25 100,18 100,50" fill="rgb(51 65 85)" />
          <polygon points="0,50 22,25 40,35 58,20 76,32 100,28 100,50" fill="rgb(30 41 59)" opacity="0.85" />
        </svg>
      </div>
    ),
  },
  fireplace: {
    label: "Fireplace",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-t from-orange-500 via-amber-500 to-red-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,rgba(253,186,116,0.7),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-black/30" />
      </div>
    ),
  },
  art: {
    label: "Art",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-400 via-amber-300 to-teal-400">
        <div className="absolute inset-0 bg-[conic-gradient(from_45deg_at_50%_50%,rgba(236,72,153,0.4),rgba(250,204,21,0.4),rgba(14,165,233,0.4),rgba(236,72,153,0.4))]" />
      </div>
    ),
  },
  off: {
    label: "Off",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-graphite-300 via-graphite-200 to-graphite-100 dark:from-graphite-700 dark:via-graphite-800 dark:to-graphite-900 flex items-center justify-center">
        <span className="text-[10px] uppercase tracking-[0.25em] text-graphite-500 dark:text-graphite-500 font-medium">
          No TV
        </span>
      </div>
    ),
  },
};

export const skyPreviews: PreviewMap<SkyKey> = {
  "blue-clouds": {
    label: "Blue + Clouds",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-sky-300 to-sky-200">
        <div className="absolute top-[25%] left-[8%] w-14 h-3 rounded-full bg-white/80 blur-[3px]" />
        <div className="absolute top-[55%] right-[10%] w-20 h-4 rounded-full bg-white/70 blur-[3px]" />
        <div className="absolute top-[40%] left-[40%] w-10 h-2.5 rounded-full bg-white/60 blur-[2px]" />
      </div>
    ),
  },
  "clear-blue": {
    label: "Clear Blue",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-b from-sky-500 via-sky-400 to-sky-300" />
    ),
  },
  "golden-hour": {
    label: "Golden Hour",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-b from-orange-400 via-amber-300 to-pink-300">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_85%,rgba(253,186,116,0.7),transparent_60%)]" />
      </div>
    ),
  },
  dramatic: {
    label: "Dramatic",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-indigo-800 to-purple-700">
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-amber-400/30 to-transparent" />
        <div className="absolute top-[30%] left-[20%] w-24 h-5 rounded-full bg-slate-700/50 blur-md" />
      </div>
    ),
  },
  "overcast-soft": {
    label: "Overcast Soft",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-b from-slate-300 via-slate-200 to-gray-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(255,255,255,0.5),transparent_70%)]" />
      </div>
    ),
  },
  "as-is": {
    label: "As-is",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-graphite-200 via-graphite-100 to-graphite-200 dark:from-graphite-800 dark:via-graphite-900 dark:to-graphite-800 flex items-center justify-center">
        <span className="text-[10px] uppercase tracking-[0.25em] text-graphite-500 font-medium">
          Unchanged
        </span>
      </div>
    ),
  },
};

export const seasonalPreviews: PreviewMap<Exclude<SeasonalKey, "">> = {
  spring: {
    label: "Spring",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-pink-200 via-green-200 to-emerald-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(244,114,182,0.35),transparent_55%)]" />
      </div>
    ),
  },
  summer: {
    label: "Summer",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-amber-200 to-emerald-400">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(253,224,71,0.6),transparent_50%)]" />
      </div>
    ),
  },
  autumn: {
    label: "Autumn",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-500 to-red-700">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(217,119,6,0.4),transparent_55%)]" />
      </div>
    ),
  },
  winter: {
    label: "Winter",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-sky-100 to-blue-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.6),transparent_65%)]" />
      </div>
    ),
  },
  twilight: {
    label: "Twilight",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 via-purple-700 to-pink-400">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_85%,rgba(236,72,153,0.5),transparent_55%)]" />
      </div>
    ),
  },
};

// A neutral "None" preview for the Seasonal picker's opt-out choice.
export function NoneSeasonalPreview() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-graphite-100 via-graphite-50 to-graphite-100 dark:from-graphite-800 dark:via-graphite-900 dark:to-graphite-800 flex items-center justify-center">
      <span className="text-[10px] uppercase tracking-[0.25em] text-graphite-500 font-medium">
        None
      </span>
    </div>
  );
}
