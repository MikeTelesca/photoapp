"use client";
import { useEffect, useState } from "react";

export function UpdateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onUpdate() { setShow(true); }
    window.addEventListener("sw-update-available", onUpdate);
    return () => window.removeEventListener("sw-update-available", onUpdate);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-cyan text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
      <span className="text-sm">✨ A new version is available</span>
      <button onClick={() => window.location.reload()}
        className="text-xs px-3 py-1 rounded bg-white text-cyan font-bold">
        Refresh
      </button>
      <button onClick={() => setShow(false)} className="text-white/80 text-base leading-none">×</button>
    </div>
  );
}
