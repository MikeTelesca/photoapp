"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";

export function DuplicateJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { addToast } = useToast();

  async function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const newAddress = prompt("New address for the copy:");
    if (newAddress === null) return; // cancelled
    try {
      const res = await fetch(`/api/jobs/${jobId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: newAddress.trim() || undefined }),
      });
      if (res.ok) {
        addToast("success", "Job duplicated");
        router.refresh();
      } else {
        addToast("error", "Failed to duplicate");
      }
    } catch (err: any) {
      addToast("error", err.message);
    }
  }

  return (
    <button
      onClick={handleDuplicate}
      className="p-1.5 text-graphite-400 hover:text-cyan transition-colors"
      title="Duplicate job"
    >
      <DocumentDuplicateIcon className="w-3.5 h-3.5" />
    </button>
  );
}
