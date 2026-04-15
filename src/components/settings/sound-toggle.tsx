"use client";
import { useState, useEffect } from "react";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setEnabled(localStorage.getItem("sound-effects") === "on");
  }, []);

  function toggle() {
    const newVal = !enabled;
    setEnabled(newVal);
    localStorage.setItem("sound-effects", newVal ? "on" : "off");
    if (newVal) {
      // Play test sound
      import("@/lib/sounds").then(({ playApproveSound }) => playApproveSound());
    }
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-sm font-medium dark:text-white">Sound effects</div>
        <div className="text-xs text-graphite-500 dark:text-graphite-400">
          Subtle audio feedback on approve, reject, and favorite
        </div>
      </div>
      <button onClick={toggle}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          enabled ? "bg-emerald-500" : "bg-graphite-300 dark:bg-graphite-700"
        }`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`} />
      </button>
    </div>
  );
}
