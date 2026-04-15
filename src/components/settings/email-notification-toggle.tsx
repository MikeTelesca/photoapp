"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";

interface Props {
  initialEnabled: boolean;
}

export function EmailNotificationToggle({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailNotifications: !enabled }),
      });

      if (res.ok) {
        setEnabled(!enabled);
        addToast("success", `Email notifications ${!enabled ? "enabled" : "disabled"}`);
      } else {
        const data = await res.json();
        addToast("error", data.error || "Failed to update settings");
      }
    } catch (err) {
      addToast("error", "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? "bg-cyan-500" : "bg-graphite-300"
      } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
