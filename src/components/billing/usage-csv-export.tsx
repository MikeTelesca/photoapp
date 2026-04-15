"use client";

import { useState } from "react";

function defaultMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function UsageCsvExport() {
  const [month, setMonth] = useState<string>(defaultMonth());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      setError("Pick a valid month");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/billing/usage-csv?month=${encodeURIComponent(month)}`);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(body || `Request failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ath-usage-${month}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || "Download failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label className="text-xs text-graphite-500 dark:text-graphite-400" htmlFor="usage-csv-month">
        Month
      </label>
      <input
        id="usage-csv-month"
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        className="rounded border border-graphite-200 bg-white px-2 py-1 text-sm dark:border-graphite-700 dark:bg-graphite-900 dark:text-white"
      />
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="rounded bg-cyan px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Preparing…" : "Download CSV"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
