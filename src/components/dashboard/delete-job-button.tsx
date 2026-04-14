"use client";

import { useRouter } from "next/navigation";
import { TrashIcon } from "@heroicons/react/24/outline";

export function DeleteJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Delete this job and all its photos? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to delete job");
      }
    } catch {
      alert("Failed to delete job");
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="p-1.5 text-graphite-400 hover:text-red-500 transition-colors"
      title="Delete job"
    >
      <TrashIcon className="w-3.5 h-3.5" />
    </button>
  );
}
