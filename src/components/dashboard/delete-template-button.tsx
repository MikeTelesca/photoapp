"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { TrashIcon } from "@heroicons/react/24/outline";

export function DeleteTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const { addToast } = useToast();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this template?")) return;
    try {
      const res = await fetch(`/api/templates/${templateId}`, { method: "DELETE" });
      if (res.ok) {
        addToast("success", "Template deleted");
        router.refresh();
      } else {
        addToast("error", "Failed to delete template");
      }
    } catch {
      addToast("error", "Failed to delete template");
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="p-1.5 text-graphite-400 hover:text-red-500 transition-colors"
      title="Delete template"
    >
      <TrashIcon className="w-4 h-4" />
    </button>
  );
}
