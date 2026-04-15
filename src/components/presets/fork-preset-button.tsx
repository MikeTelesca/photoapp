"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ForkPresetButton({ presetId }: { presetId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function fork() {
    setLoading(true);
    try {
      const res = await fetch(`/api/presets/${presetId}/fork`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Fork failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={fork}
      disabled={loading}
      className="px-2 py-1 text-xs bg-graphite-100 text-graphite-700 rounded hover:bg-graphite-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Duplicate this preset to create a modified copy"
    >
      {loading ? "..." : "Fork"}
    </button>
  );
}
