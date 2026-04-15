"use client";
import { useState } from "react";

export function WebhookForm({ initial }: { initial: string | null }) {
  const [url, setUrl] = useState(initial || "");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slackWebhookUrl: url }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    if (!url) return;
    setTesting(true);
    try {
      const res = await fetch("/api/user/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      alert(data.ok ? "Test message sent!" : "Test failed: " + (data.error || "unknown"));
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-graphite-500 dark:text-graphite-400">
        Paste a Slack or Discord webhook URL to get notified when jobs finish.
      </div>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/... or https://discord.com/api/webhooks/..."
          className="flex-1 text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
        />
        <button onClick={save} disabled={saving}
          className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold">
          {saved ? "Saved ✓" : saving ? "Saving..." : "Save"}
        </button>
        {url && (
          <button onClick={test} disabled={testing}
            className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300">
            {testing ? "Testing..." : "Test"}
          </button>
        )}
      </div>
    </div>
  );
}
