"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function PinButton({ jobId, pinned }: { jobId: string; pinned: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      await fetch(`/api/jobs/${jobId}/pin`, { method: pinned ? "DELETE" : "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={toggle} disabled={loading}
      className={`text-xs px-2 py-1 rounded border ${pinned ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300" : "border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800"}`}
      title={pinned ? "Unpin from top" : "Pin to top"}
    >
      {loading ? "..." : pinned ? "Pinned" : "Pin"}
    </button>
  );
}
