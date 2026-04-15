"use client";
import { useState } from "react";

export function ShareButton({
  jobId,
  initialToken,
  initialEnabled,
}: {
  jobId: string;
  initialToken: string | null;
  initialEnabled: boolean;
}) {
  const [token, setToken] = useState(initialToken);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [copied, setCopied] = useState(false);

  async function enable() {
    const password = window.prompt("Optional password for this share link (leave blank for no password):");
    // Cancel clicked
    if (password === null) return;
    const res = await fetch(`/api/jobs/${jobId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password || "" }),
    });
    const data = await res.json();
    setToken(data.token);
    setEnabled(true);
  }

  async function setPassword() {
    const password = window.prompt("New password (blank to remove):");
    if (password === null) return;
    await fetch(`/api/jobs/${jobId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    alert(password ? "Password set" : "Password removed");
  }

  async function disable() {
    await fetch(`/api/jobs/${jobId}/share`, { method: "DELETE" });
    setEnabled(false);
  }

  async function copy() {
    if (!token) return;
    const url = `${window.location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!enabled) {
    return (
      <button
        onClick={enable}
        className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800"
      >
        Share with client
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={copy}
        className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
      <button
        onClick={setPassword}
        className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800"
      >
        🔒 Set password
      </button>
      <button
        onClick={disable}
        className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 bg-white dark:bg-graphite-900 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-800"
      >
        Disable
      </button>
    </div>
  );
}
