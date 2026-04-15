"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaintBrushIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

interface Preset {
  id: string;
  name: string;
  slug: string;
  description: string;
  promptModifiers: string;
  isDefault: boolean;
}

export function PresetsManager({ initialPresets }: { initialPresets: Preset[] }) {
  const [presets, setPresets] = useState(initialPresets);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(id: string, data: Partial<Preset>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/presets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setPresets((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
        setEditingId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          promptModifiers: newPrompt,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setPresets((prev) => [...prev, created]);
        setShowNew(false);
        setNewName("");
        setNewDesc("");
        setNewPrompt("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this preset?")) return;
    try {
      const res = await fetch(`/api/presets/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPresets((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      {presets.map((preset) => (
        <Card key={preset.id}>
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-graphite-100 flex items-center justify-center">
                  <PaintBrushIcon className="w-5 h-5 text-graphite-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-graphite-900">{preset.name}</h3>
                  <p className="text-xs text-graphite-400">{preset.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {editingId === preset.id ? (
                  <Button
                    variant="approve"
                    className="text-xs"
                    onClick={() => {
                      const textarea = document.getElementById(`prompt-${preset.id}`) as HTMLTextAreaElement;
                      const descInput = document.getElementById(`desc-${preset.id}`) as HTMLInputElement;
                      handleSave(preset.id, {
                        promptModifiers: textarea?.value || preset.promptModifiers,
                        description: descInput?.value || preset.description,
                      });
                    }}
                    disabled={saving}
                  >
                    Save
                  </Button>
                ) : (
                  <Button variant="outline" className="text-xs" onClick={() => setEditingId(preset.id)}>
                    Edit
                  </Button>
                )}
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/presets/${preset.id}/clone`, { method: "POST" });
                    if (res.ok) {
                      const updated = await fetch("/api/presets").then(r => r.json());
                      setPresets(updated);
                    }
                  }}
                  className="px-2 py-1 text-xs bg-graphite-100 text-graphite-700 rounded hover:bg-graphite-200"
                  title="Clone this preset"
                >
                  Clone
                </button>
                {!preset.isDefault && (
                  <button
                    onClick={() => handleDelete(preset.id)}
                    className="p-2 text-graphite-400 hover:text-red-500 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {editingId === preset.id ? (
              <div className="space-y-3">
                <input
                  id={`desc-${preset.id}`}
                  defaultValue={preset.description}
                  className="w-full px-3 py-2 rounded-lg border border-graphite-200 text-sm text-graphite-900 focus:outline-none focus:border-cyan"
                  placeholder="Short description"
                />
                <textarea
                  id={`prompt-${preset.id}`}
                  defaultValue={preset.promptModifiers}
                  rows={6}
                  className="w-full px-3 py-2 rounded-lg border border-graphite-200 text-sm text-graphite-900 font-mono focus:outline-none focus:border-cyan"
                  placeholder="AI prompt modifiers..."
                />
              </div>
            ) : (
              <div className="bg-graphite-50 rounded-lg p-3 mt-2">
                <div className="text-[10px] font-semibold text-graphite-400 uppercase tracking-wider mb-1">
                  AI Prompt
                </div>
                <p className="text-xs text-graphite-600 font-mono whitespace-pre-wrap line-clamp-3">
                  {preset.promptModifiers || "No prompt configured"}
                </p>
              </div>
            )}

            {preset.isDefault && (
              <span className="inline-block mt-2 text-[10px] font-semibold text-cyan bg-cyan-50 px-2 py-0.5 rounded">
                Default
              </span>
            )}
          </div>
        </Card>
      ))}

      {showNew ? (
        <Card>
          <div className="p-5 space-y-3">
            <h3 className="text-sm font-bold text-graphite-900">New Preset</h3>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-graphite-200 text-sm focus:outline-none focus:border-cyan"
              placeholder="Preset name"
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-graphite-200 text-sm focus:outline-none focus:border-cyan"
              placeholder="Short description"
            />
            <textarea
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-graphite-200 text-sm font-mono focus:outline-none focus:border-cyan"
              placeholder="AI prompt modifiers..."
            />
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={saving || !newName.trim()}>
                {saving ? "Creating..." : "Create Preset"}
              </Button>
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowNew(true)}>
          <PlusIcon className="w-4 h-4" />
          Add New Preset
        </Button>
      )}
    </div>
  );
}
