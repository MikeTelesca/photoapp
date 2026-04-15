"use client";

import { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export function KeyboardHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("kbd-hint-dismissed")) {
      setShow(true);
    }
  }, []);

  function dismiss() {
    setShow(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("kbd-hint-dismissed", "1");
    }
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-30 bg-graphite-900 text-white rounded-xl shadow-xl p-4 max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider opacity-70">Keyboard Shortcuts</span>
        <button onClick={dismiss} className="text-white/50 hover:text-white">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between"><span>Approve</span><kbd className="bg-white/10 px-1.5 rounded">A</kbd></div>
        <div className="flex justify-between"><span>Reject</span><kbd className="bg-white/10 px-1.5 rounded">R</kbd></div>
        <div className="flex justify-between"><span>Next photo</span><kbd className="bg-white/10 px-1.5 rounded">→</kbd></div>
        <div className="flex justify-between"><span>Previous</span><kbd className="bg-white/10 px-1.5 rounded">←</kbd></div>
      </div>
    </div>
  );
}
