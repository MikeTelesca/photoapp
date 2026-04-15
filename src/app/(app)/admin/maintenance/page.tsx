"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

interface MaintenanceState {
  enabled: boolean;
  message: string | null;
}

export default function MaintenanceAdminPage() {
  const [state, setState] = useState<MaintenanceState>({
    enabled: false,
    message: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/maintenance");
      if (res.ok) {
        const data: MaintenanceState = await res.json();
        setState(data);
        setMessage(data.message ?? "");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(nextEnabled: boolean, nextMessage: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: nextEnabled,
          message: nextMessage,
        }),
      });
      if (res.ok) {
        const data: MaintenanceState = await res.json();
        setState(data);
        setMessage(data.message ?? "");
        setSavedAt(Date.now());
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title="Maintenance Mode" />
      <div className="p-6">
        <Card>
          <div className="p-5 space-y-5">
            <div>
              <h2 className="text-sm font-semibold dark:text-white">
                Site-wide maintenance mode
              </h2>
              <p className="text-xs text-graphite-500 dark:text-graphite-400 mt-1">
                When enabled, every signed-in user (except admins) is
                redirected to a static maintenance page. Use this for short
                deployments, database migrations, or incident response.
              </p>
            </div>

            {loading ? (
              <div className="text-xs text-graphite-400">Loading...</div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border border-graphite-200 dark:border-graphite-800 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium dark:text-white">
                      Status
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${
                        state.enabled
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {state.enabled
                        ? "Maintenance mode is ON — non-admin users see the maintenance page."
                        : "Site is live for all users."}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => save(!state.enabled, message)}
                    className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${
                      state.enabled
                        ? "bg-amber-500"
                        : "bg-graphite-300 dark:bg-graphite-700"
                    }`}
                    aria-label={
                      state.enabled
                        ? "Disable maintenance mode"
                        : "Enable maintenance mode"
                    }
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        state.enabled ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    save(state.enabled, message);
                  }}
                  className="space-y-3"
                >
                  <label
                    htmlFor="maintenance-message"
                    className="block text-xs font-medium text-graphite-700 dark:text-graphite-300"
                  >
                    Message shown on the maintenance page
                  </label>
                  <textarea
                    id="maintenance-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="We're upgrading our photo processing pipeline. Back in ~15 minutes."
                    className="w-full rounded-md border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-900 text-sm px-3 py-2 text-graphite-900 dark:text-white placeholder:text-graphite-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-xs font-medium transition-colors"
                    >
                      {saving ? "Saving..." : "Save message"}
                    </button>
                    {savedAt ? (
                      <span className="text-xs text-graphite-400">
                        Saved
                      </span>
                    ) : null}
                  </div>
                </form>
              </>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
