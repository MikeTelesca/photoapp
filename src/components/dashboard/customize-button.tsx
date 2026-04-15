"use client";
import { useEffect, useState } from "react";
import { DASHBOARD_WIDGETS, loadVisibility, saveVisibility } from "@/lib/dashboard-widgets";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";

export function CustomizeButton() {
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setVisibility(loadVisibility());
  }, [open]);

  function toggle(key: string) {
    const current =
      visibility[key] ??
      DASHBOARD_WIDGETS.find((w) => w.key === key)?.defaultVisible ??
      true;
    const updated = { ...visibility, [key]: !current };
    setVisibility(updated);
    saveVisibility(updated);
    window.dispatchEvent(new CustomEvent("dashboard-widgets-changed"));
  }

  function isOn(key: string) {
    return (
      visibility[key] ??
      DASHBOARD_WIDGETS.find((w) => w.key === key)?.defaultVisible ??
      true
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800 flex items-center gap-1"
        title="Customize dashboard"
      >
        <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
        Customize
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-lg shadow-xl">
            <div className="p-3 border-b border-graphite-100 dark:border-graphite-800">
              <h3 className="text-sm font-semibold dark:text-white">Show widgets</h3>
            </div>
            <ul className="p-2">
              {DASHBOARD_WIDGETS.map((w) => (
                <li
                  key={w.key}
                  className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-graphite-50 dark:hover:bg-graphite-800"
                >
                  <span className="text-sm dark:text-white">{w.label}</span>
                  <button
                    onClick={() => toggle(w.key)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      isOn(w.key)
                        ? "bg-emerald-500"
                        : "bg-graphite-300 dark:bg-graphite-700"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        isOn(w.key) ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
