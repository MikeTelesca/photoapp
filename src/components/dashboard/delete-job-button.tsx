"use client";

import { useRouter } from "next/navigation";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/components/ui/toast";

export function DeleteJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { addToast } = useToast();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Delete this job and all its photos? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (res.ok) {
        addToast("success", "Job deleted successfully.");
        router.refresh();
      } else {
        addToast("error", "Failed to delete job. Please try again.");
      }
    } catch {
      addToast("error", "Failed to delete job. Please try again.");
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
