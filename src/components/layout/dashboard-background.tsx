"use client";
import { useEffect } from "react";
import type { CSSProperties } from "react";

export type DashboardBgKey =
  | "default"
  | "gradient-cyan"
  | "gradient-purple"
  | "gradient-sunset"
  | "dots"
  | "grid"
  | "subtle-noise";

type BgOption = {
  key: DashboardBgKey;
  label: string;
  // Tailwind classes used for the small preview swatch.
  previewClass: string;
  // Inline styles used for the small preview swatch (for patterns).
  previewStyle?: CSSProperties;
};

export const BG_OPTIONS: BgOption[] = [
  {
    key: "default",
    label: "Default",
    previewClass: "bg-graphite-50 dark:bg-graphite-950",
  },
  {
    key: "gradient-cyan",
    label: "Cyan",
    previewClass: "bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-cyan-950 dark:to-blue-950",
  },
  {
    key: "gradient-purple",
    label: "Purple",
    previewClass: "bg-gradient-to-br from-purple-50 to-fuchsia-100 dark:from-purple-950 dark:to-fuchsia-950",
  },
  {
    key: "gradient-sunset",
    label: "Sunset",
    previewClass: "bg-gradient-to-br from-orange-50 via-pink-100 to-rose-100 dark:from-orange-950 dark:via-pink-950 dark:to-rose-950",
  },
  {
    key: "dots",
    label: "Dots",
    previewClass: "bg-graphite-50 dark:bg-graphite-950",
    previewStyle: {
      backgroundImage:
        "radial-gradient(rgba(100,116,139,0.35) 1px, transparent 1px)",
      backgroundSize: "10px 10px",
    },
  },
  {
    key: "grid",
    label: "Grid",
    previewClass: "bg-graphite-50 dark:bg-graphite-950",
    previewStyle: {
      backgroundImage:
        "linear-gradient(to right, rgba(100,116,139,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.22) 1px, transparent 1px)",
      backgroundSize: "12px 12px",
    },
  },
  {
    key: "subtle-noise",
    label: "Noise",
    previewClass: "bg-graphite-100 dark:bg-graphite-900",
    previewStyle: {
      backgroundImage:
        "radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
      backgroundSize: "3px 3px, 5px 5px",
      backgroundPosition: "0 0, 1px 1px",
    },
  },
];

const ALL_CLASSES = [
  "ath-bg-default",
  "ath-bg-gradient-cyan",
  "ath-bg-gradient-purple",
  "ath-bg-gradient-sunset",
  "ath-bg-dots",
  "ath-bg-grid",
  "ath-bg-subtle-noise",
];

export function applyDashboardBg(key: DashboardBgKey) {
  if (typeof document === "undefined") return;
  const body = document.body;
  ALL_CLASSES.forEach((c) => body.classList.remove(c));
  body.classList.add(`ath-bg-${key}`);
}

export function DashboardBackground() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = (localStorage.getItem("ath-dashboard-bg") as DashboardBgKey) || "default";
    applyDashboardBg(stored);
    return () => {
      if (typeof document === "undefined") return;
      ALL_CLASSES.forEach((c) => document.body.classList.remove(c));
    };
  }, []);

  return null;
}
