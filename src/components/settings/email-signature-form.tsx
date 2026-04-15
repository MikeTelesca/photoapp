"use client";
import { useState } from "react";

interface Props {
  initial: string | null;
  initialShare: string | null;
}

export function EmailSignatureForm({ initial, initialShare }: Props) {
  const [value, setValue] = useState(initial || "");
  const [shareValue, setShareValue] = useState(initialShare || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailSignature: value.trim() || null,
          shareEmailSignature: shareValue.trim() || null,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold mb-1 dark:text-white">
          Default signature (internal)
        </label>
        <p className="text-[11px] text-graphite-500 dark:text-graphite-400 mb-1">
          Used in welcome, job-ready, weekly digest, daily summary emails (you receive these).
        </p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={4}
          placeholder={"— Mike Smith\nATH Media"}
          className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white font-mono"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1 dark:text-white">
          Client-facing signature (share emails)
        </label>
        <p className="text-[11px] text-graphite-500 dark:text-graphite-400 mb-1">
          Used in share link emails (your clients see these). Leave blank to use default.
        </p>
        <textarea
          value={shareValue}
          onChange={(e) => setShareValue(e.target.value)}
          rows={4}
          placeholder={"With thanks,\nMike Smith\nATH Media · 555-1234\nathmedia.ca"}
          className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white font-mono"
        />
      </div>

      <div className="flex justify-end items-center gap-2">
        {saved && <span className="text-xs text-emerald-600 font-semibold">Saved ✓</span>}
        <button
          onClick={save}
          disabled={saving}
          data-save
          className="text-xs px-3 py-1 rounded bg-cyan text-white font-semibold"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
