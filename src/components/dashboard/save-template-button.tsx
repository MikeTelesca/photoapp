"use client";

import { useToast } from "@/components/ui/toast";
import { BookmarkIcon } from "@heroicons/react/24/outline";

export function SaveTemplateButton({ jobId }: { jobId: string }) {
  const { addToast } = useToast();

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const name = window.prompt("Template name:");
    if (name === null) return; // cancelled
    if (!name.trim()) {
      addToast("error", "Template name cannot be empty");
      return;
    }
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, name: name.trim() }),
      });
      if (res.ok) {
        addToast("success", `Template "${name.trim()}" saved`);
      } else {
        const data = await res.json().catch(() => ({}));
        addToast("error", data.error || "Failed to save template");
      }
    } catch {
      addToast("error", "Failed to save template");
    }
  }

  return (
    <button
      onClick={handleSave}
      className="p-1.5 text-graphite-400 hover:text-cyan transition-colors"
      title="Save as template"
    >
      <BookmarkIcon className="w-3.5 h-3.5" />
    </button>
  );
}
