"use client";
import { useState, useEffect } from "react";
import { applyAccent, ACCENT_MAP } from "@/components/theme/accent-provider";

export function AccentPicker() {
  const [current, setCurrent] = useState("cyan");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCurrent(localStorage.getItem("accent-color") || "cyan");
  }, []);

  function pick(name: string) {
    localStorage.setItem("accent-color", name);
    applyAccent(name);
    setCurrent(name);
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-graphite-500 dark:text-graphite-400">
        Pick an accent color for buttons and highlights. Applied instantly on this device.
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(ACCENT_MAP).map(([name, c]) => (
          <button
            key={name}
            onClick={() => pick(name)}
            className={`w-10 h-10 rounded-full border-2 transition-transform ${
              current === name ? "border-graphite-900 dark:border-white scale-110" : "border-transparent"
            }`}
            style={{ backgroundColor: c.base }}
            title={name}
            aria-label={`Set accent to ${name}`}
          />
        ))}
      </div>
    </div>
  );
}
