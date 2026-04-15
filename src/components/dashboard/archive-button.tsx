"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ArchiveButton({ jobId, archived }: { jobId: string; archived: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(archived ? "Unarchive this job?" : "Archive this job? It will be hidden from the dashboard but preserved in search.")) return;
    setLoading(true);
    try {
      await fetch(`/api/jobs/${jobId}/archive`, {
        method: archived ? "DELETE" : "POST",
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800"
      title={archived ? "Unarchive" : "Archive"}
    >
      {loading ? "..." : archived ? "📥 Unarchive" : "📦 Archive"}
    </button>
  );
}
