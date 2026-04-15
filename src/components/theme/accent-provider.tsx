"use client";
import { useEffect } from "react";

export function AccentProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const accent = localStorage.getItem("accent-color");
    if (accent) {
      applyAccent(accent);
    }
  }, []);
  return null;
}

export const ACCENT_MAP: Record<string, { base: string; hover: string }> = {
  cyan: { base: "#0891B2", hover: "#0891B2" },
  blue: { base: "#3b82f6", hover: "#2563eb" },
  violet: { base: "#8b5cf6", hover: "#7c3aed" },
  emerald: { base: "#10b981", hover: "#059669" },
  amber: { base: "#f59e0b", hover: "#d97706" },
  rose: { base: "#f43f5e", hover: "#e11d48" },
};

export function applyAccent(color: string) {
  const c = ACCENT_MAP[color] || ACCENT_MAP.cyan;
  document.documentElement.style.setProperty("--accent", c.base);
  document.documentElement.style.setProperty("--accent-hover", c.hover);
}
