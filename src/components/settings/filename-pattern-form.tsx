"use client";
import { useEffect, useRef, useState } from "react";
import { previewPatternSamples } from "@/lib/filename-pattern";

export function FilenamePatternForm({ initial }: { initial: string | null }) {
  const [pattern, setPattern] = useState(initial || "{address}-{seq}");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(initial || "{address}-{seq}");
  const firstRenderRef = useRef(true);

  const samples = previewPatternSamples(pattern);

  // Debounced save-as-you-type: persist 600ms after the user stops editing.
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    if (pattern === lastSavedRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void save(pattern);
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern]);

  async function save(value: string) {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filenamePattern: value }),
      });
      if (res.ok) {
        lastSavedRef.current = value;
        setSaved(true);
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white font-mono"
          placeholder="{address}-{seq}"
        />
        <div className="text-[11px] text-graphite-400 mt-1">
          Available: <code>{"{address}"}</code> <code>{"{client}"}</code>{" "}
          <code>{"{date}"}</code> <code>{"{preset}"}</code>{" "}
          <code>{"{photographer}"}</code> <code>{"{seq}"}</code>
        </div>
      </div>
      <div className="text-xs px-2 py-2 rounded bg-graphite-50 dark:bg-graphite-800 space-y-1">
        <div className="text-[11px] uppercase tracking-wide text-graphite-400 font-semibold">
          Preview (25-photo sample job)
        </div>
        <div>
          <span className="text-graphite-400 inline-block w-16">First:</span>{" "}
          <code className="font-semibold dark:text-white">{samples.first}</code>
        </div>
        <div>
          <span className="text-graphite-400 inline-block w-16">Middle:</span>{" "}
          <code className="font-semibold dark:text-white">{samples.middle}</code>
        </div>
        <div>
          <span className="text-graphite-400 inline-block w-16">Last:</span>{" "}
          <code className="font-semibold dark:text-white">{samples.last}</code>
        </div>
      </div>
      <div className="flex justify-end items-center gap-2 h-5">
        {saving && (
          <span className="text-xs text-graphite-400">Saving...</span>
        )}
        {!saving && saved && (
          <span className="text-xs text-emerald-600 font-semibold">Saved ✓</span>
        )}
      </div>
    </div>
  );
}
