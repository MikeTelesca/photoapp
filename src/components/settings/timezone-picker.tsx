"use client";
import { useState, useEffect } from "react";

const COMMON_TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/Toronto",
  "America/New_York",
  "America/Halifax",
  "America/St_Johns",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Athens",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

interface Props {
  initial: string | null;
}

export function TimezonePicker({ initial }: Props) {
  const detected =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "";
  const [value, setValue] = useState(initial || detected || "UTC");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync initial value to localStorage on mount
  useEffect(() => {
    if (initial && typeof window !== "undefined") {
      localStorage.setItem("user-timezone", initial);
      window.dispatchEvent(
        new CustomEvent("timezone-changed", { detail: initial })
      );
    }
  }, [initial]);

  async function save(newVal: string) {
    setValue(newVal);
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: newVal }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        // Store in localStorage so client-side formatting picks it up immediately
        if (typeof window !== "undefined") {
          localStorage.setItem("user-timezone", newVal);
          window.dispatchEvent(
            new CustomEvent("timezone-changed", { detail: newVal })
          );
        }
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-graphite-500 dark:text-graphite-400">
        Display dates and times in your timezone. Detected:{" "}
        <code className="bg-graphite-100 dark:bg-graphite-800 px-1 rounded">
          {detected}
        </code>
      </div>
      <div className="flex gap-2 items-center">
        <select
          value={value}
          onChange={(e) => save(e.target.value)}
          className="flex-1 text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
        >
          {[...new Set([detected, ...COMMON_TIMEZONES])]
            .filter(Boolean)
            .map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
        </select>
        {saving && <span className="text-xs text-graphite-400">Saving...</span>}
        {saved && (
          <span className="text-xs text-emerald-600 font-semibold">
            Saved ✓
          </span>
        )}
      </div>
    </div>
  );
}
