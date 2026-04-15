"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

interface Client {
  id: string;
  name: string;
}

export function MergeClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedFrom, setSelectedFrom] = useState("");
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => {
        const clientList = (d.clients || d || []).filter((c: Client) => c.id !== clientId);
        setClients(clientList);
      })
      .catch(() => {
        setError("Failed to load clients");
      });
  }, [open, clientId]);

  async function merge() {
    if (!selectedFrom) return;
    const fromClient = clients.find((c) => c.id === selectedFrom);
    if (!confirm(`Merge "${fromClient?.name}" into "${clientName}"?\n\nAll jobs will be reassigned and the source client will be deleted. This cannot be undone.`)) {
      return;
    }

    setMerging(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${clientId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mergeFromId: selectedFrom }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Merged. ${data.jobsMoved} jobs moved.`);
        router.refresh();
        setOpen(false);
        setSelectedFrom("");
      } else {
        setError(data.error || "Failed to merge");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setMerging(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 text-graphite-600 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800 transition-colors"
      >
        🔀 Merge from another client
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 items-center">
        <select
          value={selectedFrom}
          onChange={(e) => setSelectedFrom(e.target.value)}
          className="flex-1 text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
        >
          <option value="">— Pick client to merge from —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button
          onClick={merge}
          disabled={!selectedFrom || merging}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          {merging ? "Merging..." : "Merge"}
        </Button>
        <button
          onClick={() => {
            setOpen(false);
            setSelectedFrom("");
            setError("");
          }}
          className="text-graphite-400 hover:text-graphite-600 dark:hover:text-graphite-300"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
      {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</div>}
    </div>
  );
}
