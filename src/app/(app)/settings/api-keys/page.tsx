"use client";
import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

interface Key { id: string; name: string; keyPrefix: string; lastUsedAt?: string | null; createdAt: string; }

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/user/api-keys");
      const data = await res.json();
      setKeys(data.keys || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();
      if (res.ok) {
        setRevealedKey(data.key);
        setNewKeyName("");
        load();
      }
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this API key? Existing integrations using it will stop working.")) return;
    await fetch(`/api/user/api-keys/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <>
      <Topbar title="API Keys" />
      <div className="p-6 space-y-4">
        {revealedKey && (
          <Card>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500">
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">Save this key now</h3>
              <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                This is the only time this key will be shown. Copy it somewhere safe.
              </p>
              <div className="flex gap-2 items-center">
                <input readOnly value={revealedKey}
                  className="flex-1 text-xs font-mono px-3 py-2 rounded bg-white dark:bg-graphite-900 border border-amber-300" />
                <button onClick={() => navigator.clipboard.writeText(revealedKey)}
                  className="text-xs px-3 py-2 rounded bg-amber-500 text-white font-semibold">Copy</button>
                <button onClick={() => setRevealedKey(null)}
                  className="text-xs px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300">Dismiss</button>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-2 dark:text-white">Create a new key</h2>
            <p className="text-xs text-graphite-500 dark:text-graphite-400 mb-3">
              API keys allow external apps (Zapier, scripts, etc.) to access your account. Include in the Authorization header as &quot;Bearer ath_...&quot;.
            </p>
            <div className="flex gap-2">
              <input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. 'Zapier integration')"
                onKeyDown={(e) => { if (e.key === "Enter") create(); }}
                className="flex-1 text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
              />
              <button onClick={create} disabled={!newKeyName.trim() || creating}
                className="text-xs px-4 py-2 rounded bg-cyan text-white font-semibold disabled:opacity-50">
                {creating ? "Creating..." : "Create key"}
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-3 dark:text-white">Your API keys</h2>
            {loading ? (
              <div className="text-xs text-graphite-400">Loading...</div>
            ) : keys.length === 0 ? (
              <div className="text-xs text-graphite-400 text-center py-4">No API keys yet</div>
            ) : (
              <ul className="divide-y divide-graphite-50 dark:divide-graphite-800">
                {keys.map(k => (
                  <li key={k.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium dark:text-white">{k.name}</div>
                      <div className="text-[11px] font-mono text-graphite-500 dark:text-graphite-400">{k.keyPrefix}&bull;&bull;&bull;</div>
                      <div className="text-[10px] text-graphite-400">
                        Created {new Date(k.createdAt).toLocaleDateString()}
                        {k.lastUsedAt && ` \u00b7 Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                      </div>
                    </div>
                    <button onClick={() => revoke(k.id)}
                      className="text-xs px-3 py-1.5 rounded bg-red-500 text-white">Revoke</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
