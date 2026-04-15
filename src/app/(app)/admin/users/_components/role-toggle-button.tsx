"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface RoleToggleButtonProps {
  userId: string;
  currentRole: string;
  userName: string;
}

export function RoleToggleButton({ userId, currentRole, userName }: RoleToggleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newRole = currentRole === "admin" ? "photographer" : "admin";

  async function handleToggle() {
    if (!confirm(`Change ${userName}'s role to ${newRole}?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }

      // Reload the page to reflect changes
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleToggle}
        disabled={loading}
        className="text-xs px-2.5 py-1.5 rounded-md bg-graphite-100 dark:bg-graphite-700 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-200 dark:hover:bg-graphite-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {loading ? "..." : `Make ${newRole === "admin" ? "admin" : "photographer"}`}
      </button>
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
