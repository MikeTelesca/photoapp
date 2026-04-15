"use client";

import { useState } from "react";

const TIERS = ["standard", "pro", "unlimited", "banned"] as const;
type Tier = (typeof TIERS)[number];

interface TierSelectProps {
  userId: string;
  currentTier: string;
}

export function TierSelect({ userId, currentTier }: TierSelectProps) {
  const [tier, setTier] = useState<string>(currentTier || "standard");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Tier;
    const prev = tier;
    setTier(next);
    setSaving(true);
    setStatus("idle");
    setErrMsg(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rateLimitTier: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update");
      }
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } catch (err) {
      setTier(prev);
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={tier}
        onChange={handleChange}
        disabled={saving}
        className="text-xs px-2 py-1 rounded-md border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-900 dark:text-white disabled:opacity-50"
      >
        {TIERS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      {status === "saved" && (
        <span className="text-xs text-green-600 dark:text-green-400">saved</span>
      )}
      {status === "error" && (
        <span className="text-xs text-red-600 dark:text-red-400">{errMsg || "error"}</span>
      )}
    </div>
  );
}
