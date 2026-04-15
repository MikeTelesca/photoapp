"use client";

import { useEffect, useState } from "react";

interface Client {
  id: string;
  name: string;
  email?: string | null;
  defaultPreset?: string | null;
  defaultTags?: string | null;
}

interface Props {
  value: string | null;
  onChange: (clientId: string | null, clientName: string, defaultPreset?: string | null, defaultTags?: string | null) => void;
}

export function ClientPicker({ value, onChange }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => {
        setClients(Array.isArray(data) ? data : data.clients || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function createClient() {
    if (!newName.trim()) return;
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      const client = await res.json();
      setClients([...clients, client]);
      onChange(client.id, client.name, client.defaultPreset, client.defaultTags);
      setNewName("");
      setCreating(false);
    }
  }

  if (loading) return <div className="text-xs text-graphite-400">Loading clients...</div>;

  return (
    <div className="flex gap-2 items-center">
      <select
        value={value || ""}
        onChange={(e) => {
          const c = clients.find((c) => c.id === e.target.value);
          onChange(e.target.value || null, c?.name || "", c?.defaultPreset || null, c?.defaultTags || null);
        }}
        className="flex-1 text-sm px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
      >
        <option value="">— No client —</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.email ? ` (${c.email})` : ""}
          </option>
        ))}
      </select>
      {creating ? (
        <div className="flex gap-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); createClient(); }
              if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
            placeholder="Client name"
            className="text-sm px-2 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white focus:outline-none focus:border-cyan"
          />
          <button
            type="button"
            onClick={createClient}
            className="text-xs px-2 bg-cyan text-white rounded-lg font-semibold"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setCreating(false); setNewName(""); }}
            className="text-xs px-2 text-graphite-500 hover:text-graphite-700"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="text-xs px-3 py-2 rounded-lg bg-cyan-50 text-cyan font-semibold border border-cyan-200 hover:bg-cyan-100 transition-colors whitespace-nowrap"
        >
          + New client
        </button>
      )}
    </div>
  );
}
