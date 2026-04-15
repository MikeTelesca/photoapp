"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, TrashIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  defaultPreset: string | null;
  defaultTags: string | null;
}

export function ClientDetailActions({ client }: { client: Client }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: client.name,
    email: client.email || "",
    phone: client.phone || "",
    company: client.company || "",
    notes: client.notes || "",
    defaultPreset: client.defaultPreset || "",
    defaultTags: client.defaultTags || "",
  });

  async function handleSave() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      setEditing(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      router.push("/clients");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setSaving(false);
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <div className="w-full mt-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-graphite-700 dark:text-graphite-300 mb-1">Name *</label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 text-sm dark:bg-graphite-800 dark:text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-graphite-700 dark:text-graphite-300 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 text-sm dark:bg-graphite-800 dark:text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-graphite-700 dark:text-graphite-300 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 text-sm dark:bg-graphite-800 dark:text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-graphite-700 dark:text-graphite-300 mb-1">Company</label>
            <input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 text-sm dark:bg-graphite-800 dark:text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-graphite-700 dark:text-graphite-300 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 text-sm dark:bg-graphite-800 dark:text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan resize-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-graphite-700 dark:text-graphite-300 mb-1">Default Preset (optional)</label>
            <select
              value={form.defaultPreset}
              onChange={(e) => setForm({ ...form, defaultPreset: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 text-sm dark:bg-graphite-800 dark:text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
            >
              <option value="">— None —</option>
              <option value="mls-standard">MLS Standard</option>
              <option value="standard">Standard</option>
              <option value="bright">Bright & Airy</option>
              <option value="luxury">Luxury</option>
              <option value="flambient">Flambient</option>
            </select>
            <div className="text-[11px] text-graphite-400 dark:text-graphite-500 mt-1">Auto-applied when this client is selected on a new job</div>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold mb-1 block dark:text-graphite-300">Default tags (optional)</label>
            <input type="text" value={form.defaultTags} onChange={(e) => setForm({ ...form, defaultTags: e.target.value })}
              placeholder="rush, premium, kw-realty"
              className="w-full text-sm px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan" />
            <div className="text-[11px] text-graphite-400 mt-1">Comma-separated, auto-applied on new jobs for this client</div>
          </div>
        </div>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</div>
        )}
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            <CheckIcon className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button variant="outline" onClick={() => { setEditing(false); setError(""); }}>
            <XMarkIcon className="w-3.5 h-3.5" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (deleting) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="text-sm text-graphite-700 dark:text-graphite-300">Delete this client?</p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button
            onClick={handleDelete}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {saving ? "Deleting..." : "Yes, delete"}
          </Button>
          <Button variant="outline" onClick={() => { setDeleting(false); setError(""); }}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-graphite-200 dark:border-graphite-700 text-graphite-600 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800 transition-colors"
      >
        <PencilIcon className="w-3.5 h-3.5" />
        Edit
      </button>
      <button
        onClick={() => setDeleting(true)}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <TrashIcon className="w-3.5 h-3.5" />
        Delete
      </button>
    </div>
  );
}
