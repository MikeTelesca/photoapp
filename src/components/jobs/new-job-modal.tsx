"use client";

import { useEffect, useState } from "react";
import { NewJobForm } from "./new-job-form";

export function NewJobTile() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan/15 via-cyan/5 to-transparent border border-cyan/30 hover:border-cyan/60 transition-all p-6 text-left h-full min-h-[180px] flex flex-col justify-between"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(34,211,238,0.25),transparent_55%)] opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="relative">
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan/80 mb-2">
            Start new
          </div>
          <div className="text-3xl sm:text-4xl font-semibold text-white tracking-tight leading-[1.05]">
            Create a job
          </div>
        </div>
        <div className="relative flex items-end justify-between">
          <p className="text-sm text-graphite-400 max-w-[70%] leading-snug">
            Drop in a Dropbox link or upload, pick a look, let it rip.
          </p>
          <div className="w-11 h-11 rounded-full bg-cyan text-graphite-950 flex items-center justify-center shadow-lg shadow-cyan/30 group-hover:scale-110 transition-transform">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 9H15M9 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-3xl bg-graphite-900 border border-graphite-800 rounded-3xl shadow-2xl my-4">
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-graphite-800">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan mb-1">
                  New job
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                  Set it up
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-9 h-9 rounded-full border border-graphite-800 text-graphite-400 hover:text-white hover:border-graphite-600 transition flex items-center justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2 2L12 12M12 2L2 12"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 sm:px-8 py-6">
              <NewJobForm onClose={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
