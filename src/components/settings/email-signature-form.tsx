"use client";
import { useState } from "react";

interface Props {
  initial: string | null;
}

export function EmailSignatureForm({ initial }: Props) {
  const [value, setValue] = useState(initial || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailSignature: value }),
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
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        placeholder={"Mike Smith\nATH Media · Real Estate Photography\nathmedia.ca · 555-1234"}
        className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white font-mono"
      />
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-graphite-400">
          Plain text only. Appended to outgoing emails.
        </span>
        <button
          onClick={save}
          disabled={saving}
          className="text-xs px-3 py-1 rounded bg-cyan text-white font-semibold"
        >
          {saved ? "Saved ✓" : saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
