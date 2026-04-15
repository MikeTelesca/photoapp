"use client";

import { useEffect, useState } from "react";

interface Props {
  jobId: string;
}

/**
 * 👁 Watch/unwatch toggle for admins (and job owners) to subscribe to
 * status changes on a job. On mount, fetches current watch state via the
 * same POST endpoint (idempotent upsert) — to avoid that, we lazy-load:
 * the button starts in "off" visual state and toggles on click. First click
 * subscribes; a second click unsubscribes. State persists server-side.
 */
export function WatchButton({ jobId }: Props) {
  const [watching, setWatching] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  // On mount, probe current state via GET (not exposed) — skip: we default to
  // unknown and let the user toggle; both POST and DELETE are idempotent.
  useEffect(() => {
    setWatching(false);
  }, [jobId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const nextWatching = !watching;
    try {
      const res = await fetch(`/api/jobs/${jobId}/watch`, {
        method: nextWatching ? "POST" : "DELETE",
      });
      if (res.ok) {
        setWatching(nextWatching);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to update watch state");
      }
    } catch (err) {
      console.error("[watch-button]", err);
    } finally {
      setBusy(false);
    }
  }

  const isOn = watching === true;
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={isOn ? "Stop watching this job" : "Watch this job for status changes"}
      aria-label={isOn ? "Unwatch job" : "Watch job"}
      aria-pressed={isOn}
      className={`text-xs px-2 py-1 rounded border transition-colors ${
        isOn
          ? "border-cyan text-cyan bg-cyan/10 dark:border-cyan dark:text-cyan"
          : "border-graphite-200 dark:border-graphite-700 text-graphite-600 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800"
      } ${busy ? "opacity-50 cursor-wait" : ""}`}
    >
      {isOn ? "Watching" : "Watch"}
    </button>
  );
}
