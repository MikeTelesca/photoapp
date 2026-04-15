"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export function DemoJobButton() {
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  async function handleClick() {
    setCreating(true);
    try {
      const res = await fetch("/api/jobs/demo", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        addToast(
          "success",
          "Demo job created — click 'Start Processing' to see it work"
        );
        router.refresh();
      } else {
        addToast("error", data.error || "Failed to create demo");
      }
    } catch (error) {
      console.error("Error creating demo job:", error);
      addToast("error", "Failed to create demo job");
    } finally {
      setCreating(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={creating}
      className="mt-4 px-4 py-2 rounded-lg bg-cyan text-white text-xs font-semibold hover:bg-cyan-dark disabled:opacity-50 transition-all"
    >
      {creating ? "Creating..." : "✨ Try a Demo Job"}
    </button>
  );
}
