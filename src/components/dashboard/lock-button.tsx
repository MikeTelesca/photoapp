"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LockButton({ jobId, locked }: { jobId: string; locked: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (locked && !confirm("Unlock this job? Editing will be re-enabled.")) return;
    if (!locked && !confirm("Lock this job? Further edits will be blocked until unlocked.")) return;
    setLoading(true);
    try {
      await fetch(`/api/jobs/${jobId}/lock`, { method: locked ? "DELETE" : "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={toggle} disabled={loading}
      className={`text-xs px-2 py-1 rounded border ${locked ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300" : "border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800"}`}
      title={locked ? "Unlock to allow edits" : "Lock to prevent edits"}>
      {loading ? "..." : locked ? "Locked" : "Lock"}
    </button>
  );
}
