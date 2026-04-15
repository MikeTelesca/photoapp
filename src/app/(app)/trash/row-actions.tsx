"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function TrashRowActions({
  jobId,
  address,
}: {
  jobId: string;
  address: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const restore = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/restore`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to restore job");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  };

  const purge = async () => {
    if (
      !confirm(
        `Permanently delete "${address}"? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/purge`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to delete job");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || isPending;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={restore}
        disabled={disabled}
        className="text-xs px-3 py-1.5 rounded-md border border-graphite-200 dark:border-graphite-700 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-100 dark:hover:bg-graphite-800 disabled:opacity-50"
      >
        Restore
      </button>
      <button
        type="button"
        onClick={purge}
        disabled={disabled}
        className="text-xs px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
      >
        Delete Forever
      </button>
    </div>
  );
}
