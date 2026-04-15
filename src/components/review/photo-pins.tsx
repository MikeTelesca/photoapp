"use client";
import { useEffect, useState } from "react";

interface Pin { id: string; x: number; y: number; note: string; createdAt: string; }

interface Props {
  jobId: string;
  photoId: string;
  enabled: boolean;
}

export function PhotoPins({ jobId, photoId, enabled }: Props) {
  const [pins, setPins] = useState<Pin[]>([]);
  const [adding, setAdding] = useState<{ x: number; y: number } | null>(null);
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    if (!enabled) return;
    fetch(`/api/jobs/${jobId}/photos/${photoId}/pins`)
      .then(r => r.json())
      .then(d => setPins(d.pins || []))
      .catch(() => {});
  }, [enabled, photoId, jobId]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!enabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setAdding({ x, y });
    setNewNote("");
  }

  async function savePin() {
    if (!adding || !newNote.trim()) return;
    const res = await fetch(`/api/jobs/${jobId}/photos/${photoId}/pins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x: adding.x, y: adding.y, note: newNote }),
    });
    if (res.ok) {
      const pin = await res.json();
      setPins([...pins, pin]);
    }
    setAdding(null);
    setNewNote("");
  }

  async function deletePin(id: string) {
    if (!confirm("Delete this pin?")) return;
    await fetch(`/api/jobs/${jobId}/photos/${photoId}/pins/${id}`, { method: "DELETE" });
    setPins(pins.filter(p => p.id !== id));
  }

  if (!enabled && pins.length === 0) return null;

  return (
    <div className="absolute inset-0" onClick={enabled ? handleClick : undefined}
      style={{ cursor: enabled ? "crosshair" : "default" }}>
      {pins.map(pin => (
        <div key={pin.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 group"
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}>
          <div className="w-6 h-6 rounded-full bg-amber-400 text-graphite-900 text-xs font-bold flex items-center justify-center shadow-lg ring-2 ring-white">
            !
          </div>
          <div className="hidden group-hover:block absolute left-full ml-2 top-0 bg-white dark:bg-graphite-900 text-xs px-2 py-1 rounded shadow-lg w-40 text-graphite-800 dark:text-graphite-200 z-10">
            <button onClick={(e) => { e.stopPropagation(); deletePin(pin.id); }}
              className="absolute top-0 right-0 text-red-500 text-base px-1 leading-none">×</button>
            <div className="pr-3">{pin.note}</div>
          </div>
        </div>
      ))}
      {adding && (
        <div className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
          style={{ left: `${adding.x}%`, top: `${adding.y}%` }}>
          <div className="w-6 h-6 rounded-full bg-cyan animate-pulse" />
          <div className="absolute left-full ml-2 top-0 bg-white dark:bg-graphite-900 p-2 rounded shadow-lg w-56" onClick={(e) => e.stopPropagation()}>
            <textarea autoFocus value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2}
              placeholder="Note about this spot..."
              className="w-full text-xs px-1 py-0.5 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white" />
            <div className="flex gap-1 mt-1">
              <button onClick={savePin} disabled={!newNote.trim()}
                className="text-[10px] px-2 py-0.5 rounded bg-cyan text-white">Save</button>
              <button onClick={() => setAdding(null)}
                className="text-[10px] px-2 py-0.5 rounded text-graphite-500">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
