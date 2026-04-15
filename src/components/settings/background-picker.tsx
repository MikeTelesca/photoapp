"use client";
import { useState, useEffect } from "react";
import { applyDashboardBg, BG_OPTIONS, type DashboardBgKey } from "@/components/layout/dashboard-background";

export function BackgroundPicker() {
  const [current, setCurrent] = useState<DashboardBgKey>("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = (localStorage.getItem("ath-dashboard-bg") as DashboardBgKey) || "default";
    setCurrent(stored);
  }, []);

  function pick(name: DashboardBgKey) {
    localStorage.setItem("ath-dashboard-bg", name);
    applyDashboardBg(name);
    setCurrent(name);
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-graphite-500 dark:text-graphite-400">
        Pick a background for the dashboard. Applied instantly on this device.
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {BG_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => pick(opt.key)}
            className={`group flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition ${
              current === opt.key
                ? "ring-2 ring-cyan-500 dark:ring-cyan-400"
                : "ring-1 ring-graphite-200 dark:ring-graphite-800 hover:ring-graphite-400"
            }`}
            title={opt.label}
            aria-label={`Set dashboard background to ${opt.label}`}
          >
            <div
              className={`w-full h-14 rounded-md ${opt.previewClass}`}
              style={opt.previewStyle}
            />
            <span className="text-[11px] font-medium text-graphite-700 dark:text-graphite-300 truncate max-w-full">
              {opt.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
