"use client";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

interface Flag {
  key: string;
  name: string;
  enabled: boolean;
  description?: string | null;
}

export default function FlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/flags");
    const data = await res.json();
    setFlags(data.flags || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(key: string, enabled: boolean) {
    await fetch("/api/admin/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled }),
    });
    load();
  }

  return (
    <>
      <Topbar title="Feature Flags" />
      <div className="p-6">
        <Card>
          <div className="p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold dark:text-white">
                Feature toggles
              </h2>
              <p className="text-xs text-graphite-500 dark:text-graphite-400 mt-1">
                Enable/disable experimental or optional features globally for
                all users.
              </p>
            </div>
            {loading ? (
              <div className="text-xs text-graphite-400">Loading...</div>
            ) : (
              <ul className="divide-y divide-graphite-100 dark:divide-graphite-800">
                {flags.map((f) => (
                  <li
                    key={f.key}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <div className="text-sm font-medium dark:text-white">
                        {f.name}
                      </div>
                      <div className="text-[11px] text-graphite-400 font-mono">
                        {f.key}
                      </div>
                    </div>
                    <button
                      onClick={() => toggle(f.key, !f.enabled)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        f.enabled
                          ? "bg-emerald-500"
                          : "bg-graphite-300 dark:bg-graphite-700"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          f.enabled ? "translate-x-6" : "translate-x-0.5"
                        }`}
                      />
                    </button>
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
