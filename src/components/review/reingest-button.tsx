"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { ArrowDownOnSquareStackIcon } from "@heroicons/react/24/outline";

export function ReingestButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  async function handleClick() {
    if (!confirm("Re-check Dropbox folder for new photos?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/reingest`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        addToast("success", data.message);
        if (data.added > 0) router.refresh();
      } else {
        addToast("error", data.error || "Re-ingest failed");
      }
    } catch (err: any) {
      addToast("error", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-graphite-100 text-graphite-700 hover:bg-graphite-200 disabled:opacity-50"
      title="Check Dropbox for new photos"
    >
      <ArrowDownOnSquareStackIcon className="w-4 h-4" />
      {loading ? "Checking..." : "Re-ingest"}
    </button>
  );
}
