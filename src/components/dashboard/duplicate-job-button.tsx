"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";

export function DuplicateJobButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  async function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Duplicate this job? A new pending job with the same settings will be created.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/duplicate`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        addToast("success", "Job duplicated! Add a Dropbox URL or upload photos to get started.");
        router.refresh();
      } else {
        addToast("error", "Failed to duplicate job");
      }
    } catch (err: any) {
      addToast("error", err.message || "Error duplicating job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDuplicate}
      disabled={loading}
      className="p-1.5 text-graphite-400 hover:text-cyan disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Duplicate job with same settings (no photos)"
    >
      <DocumentDuplicateIcon className="w-3.5 h-3.5" />
    </button>
  );
}
