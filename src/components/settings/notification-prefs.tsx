"use client";
import { useState } from "react";

interface Props {
  initial: {
    notifyJobReady?: boolean;
    notifyClientComment?: boolean;
    notifyPhotoFailed?: boolean;
  };
}

export function NotificationPrefs({ initial }: Props) {
  const [prefs, setPrefs] = useState({
    notifyJobReady: initial.notifyJobReady ?? true,
    notifyClientComment: initial.notifyClientComment ?? true,
    notifyPhotoFailed: initial.notifyPhotoFailed ?? true,
  });
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(field: keyof typeof prefs) {
    const newVal = !prefs[field];
    setPrefs(p => ({ ...p, [field]: newVal }));
    setSaving(field);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newVal }),
      });
    } finally {
      setSaving(null);
    }
  }

  const items = [
    { key: "notifyJobReady" as const, label: "Jobs ready for review", desc: "When an AI enhance batch completes" },
    { key: "notifyClientComment" as const, label: "Client comments", desc: "When a client posts feedback via the share link" },
    { key: "notifyPhotoFailed" as const, label: "Photo failed to enhance", desc: "When a photo couldn't be enhanced after retries" },
  ];

  return (
    <ul className="divide-y divide-graphite-100 dark:divide-graphite-800">
      {items.map(item => (
        <li key={item.key} className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-medium dark:text-white">{item.label}</div>
            <div className="text-xs text-graphite-500 dark:text-graphite-400">{item.desc}</div>
          </div>
          <button onClick={() => toggle(item.key)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              prefs[item.key] ? "bg-emerald-500" : "bg-graphite-300 dark:bg-graphite-700"
            }`}
            disabled={saving === item.key}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              prefs[item.key] ? "translate-x-5" : "translate-x-0.5"
            }`} />
          </button>
        </li>
      ))}
    </ul>
  );
}
