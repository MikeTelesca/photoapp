"use client";
import { useState } from "react";

export function BackupRestore() {
  const [importing, setImporting] = useState(false);

  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`Import settings from "${file.name}"? This will overwrite your current settings.`)) {
      e.target.value = "";
      return;
    }
    setImporting(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/user/settings/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Imported ${data.applied} settings.`);
        window.location.reload();
      } else {
        alert(data.error || "Import failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Invalid JSON";
      alert("Failed to parse file: " + errorMessage);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-graphite-500 dark:text-graphite-400">
        Backup all your account preferences as JSON, or restore from a previous backup.
      </p>
      <div className="flex gap-2">
        <a
          href="/api/user/settings/export"
          download
          className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold inline-block hover:opacity-90 transition-opacity"
        >
          📥 Export settings
        </a>
        <label
          className={`text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 cursor-pointer hover:border-graphite-300 dark:hover:border-graphite-600 transition-colors ${
            importing ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {importing ? "Importing..." : "📤 Import settings"}
          <input
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={importFile}
            disabled={importing}
          />
        </label>
      </div>
    </div>
  );
}
