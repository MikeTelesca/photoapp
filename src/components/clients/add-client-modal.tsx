"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

export function AddClientModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });

  function reset() {
    setForm({ name: "", email: "", phone: "", company: "", notes: "" });
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create client");
      }
      setOpen(false);
      reset();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => { reset(); setOpen(true); }}>
        <PlusIcon className="w-3.5 h-3.5" />
        Add client
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white dark:bg-graphite-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-graphite-900 dark:text-white">Add Client</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-graphite-400 hover:text-graphite-600 dark:hover:text-graphite-300"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-graphite-700 dark:text-graphite-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Sarah Johnson"
                  className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 text-sm dark:bg-graphite-800 dark:text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-graphite-700 dark:text-graphite-300 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="sarah@realty.com"
                  className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 text-sm dark:bg-graphite-800 dark:text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-graphite-700 dark:text-graphite-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="416-555-0100"
                  className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 text-sm dark:bg-graphite-800 dark:text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-graphite-700 dark:text-graphite-300 mb-1">Company</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Johnson Realty Group"
                  className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 text-sm dark:bg-graphite-800 dark:text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-graphite-700 dark:text-graphite-300 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Prefers rush turnaround, VIP client..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-graphite-200 dark:border-graphite-700 text-sm dark:bg-graphite-800 dark:text-white focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan resize-none"
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</div>
              )}
              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Add Client"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
