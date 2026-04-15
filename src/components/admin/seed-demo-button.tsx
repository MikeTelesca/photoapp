"use client";
import { useState } from "react";

export function SeedDemoButton() {
  const [loading, setLoading] = useState(false);

  async function seed() {
    if (
      !confirm(
        "Create demo jobs and clients in your account? This is safe — nothing will be uploaded to Dropbox."
      )
    )
      return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/seed-demo", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(
          `Created ${data.jobsCreated} jobs, ${data.clientsCreated} clients. Refresh to see them.`
        );
        window.location.reload();
      } else {
        alert(data.error || "Failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={seed}
      disabled={loading}
      className="text-xs px-3 py-1.5 rounded bg-purple-500 text-white font-semibold hover:bg-purple-600 disabled:opacity-50"
    >
      {loading ? "Seeding..." : "🌱 Seed demo data"}
    </button>
  );
}
