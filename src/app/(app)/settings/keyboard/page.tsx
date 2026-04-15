"use client";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { SHORTCUTS, loadBindings, saveBindings } from "@/lib/keyboard-shortcuts";

export default function KeyboardSettingsPage() {
  const [bindings, setBindings] = useState<Record<string, string>>({});
  const [recording, setRecording] = useState<string | null>(null);

  useEffect(() => {
    setBindings(loadBindings());
  }, []);

  function startRecording(id: string) {
    setRecording(id);
  }

  function cancelRecording() {
    setRecording(null);
  }

  useEffect(() => {
    if (!recording) return;
    function onKey(e: KeyboardEvent) {
      e.preventDefault();
      if (e.key === "Escape") {
        setRecording(null);
        return;
      }
      const newBindings = { ...bindings, [recording!]: e.key };
      setBindings(newBindings);
      saveBindings(newBindings);
      setRecording(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recording, bindings]);

  function reset() {
    if (!confirm("Reset all shortcuts to defaults?")) return;
    localStorage.removeItem("keyboard-bindings-v1");
    setBindings({});
  }

  function displayKey(key: string): string {
    if (key === "ArrowLeft") return "←";
    if (key === "ArrowRight") return "→";
    if (key === "ArrowUp") return "↑";
    if (key === "ArrowDown") return "↓";
    if (key === " ") return "Space";
    return key.toUpperCase();
  }

  return (
    <>
      <Topbar title="Keyboard Shortcuts" />
      <div className="p-6">
        <Card>
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold dark:text-white">Customize shortcuts</h2>
              <button onClick={reset}
                className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300">
                Reset all
              </button>
            </div>
            <div className="space-y-2">
              {SHORTCUTS.map(s => {
                const current = bindings[s.id] || s.defaultKey;
                const isRecording = recording === s.id;
                return (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-graphite-50 dark:border-graphite-800 last:border-b-0">
                    <div>
                      <div className="text-sm dark:text-white">{s.label}</div>
                      <div className="text-xs text-graphite-400">Default: {displayKey(s.defaultKey)}</div>
                    </div>
                    <button
                      onClick={() => isRecording ? cancelRecording() : startRecording(s.id)}
                      className={`min-w-20 text-xs px-3 py-1.5 rounded font-mono font-bold ${
                        isRecording
                          ? "bg-amber-500 text-white animate-pulse"
                          : "bg-graphite-100 dark:bg-graphite-800 dark:text-white"
                      }`}
                    >
                      {isRecording ? "Press key..." : displayKey(current)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
