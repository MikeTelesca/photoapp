"use client";
import { useState } from "react";

interface Props {
  initialName: string;
  initialSlug: string;
  initialEnabled: boolean;
  initialBio: string;
}

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function PortfolioSettingsForm({
  initialName,
  initialSlug,
  initialEnabled,
  initialBio,
}: Props) {
  const [slug, setSlug] = useState(initialSlug);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [bio, setBio] = useState(initialBio);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedSlug, setSavedSlug] = useState(initialSlug);
  const [savedEnabled, setSavedEnabled] = useState(initialEnabled);

  async function save() {
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const normalized = slug ? slugify(slug) : "";
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolioSlug: normalized || null,
          portfolioEnabled: enabled,
          portfolioBio: bio.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save");
        return;
      }
      setSavedSlug(normalized);
      setSavedEnabled(enabled);
      setSlug(normalized);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = savedSlug ? `${origin}/portfolio/${savedSlug}` : null;

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold mb-1 dark:text-white">
          Photographer name
        </label>
        <p className="text-[11px] text-graphite-500 dark:text-graphite-400 mb-1">
          Shown on your public page. Change this under Account.
        </p>
        <input
          value={initialName}
          disabled
          className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 bg-graphite-50 dark:bg-graphite-800 dark:text-white"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-semibold dark:text-white">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 accent-cyan-600"
          />
          Enable public portfolio page
        </label>
        <p className="text-[11px] text-graphite-500 dark:text-graphite-400 mt-1 ml-6">
          When off, your portfolio URL returns a 404.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1 dark:text-white">
          Portfolio URL slug
        </label>
        <p className="text-[11px] text-graphite-500 dark:text-graphite-400 mb-1">
          Lowercase letters, numbers, and dashes only.
        </p>
        <div className="flex items-stretch gap-0">
          <span className="text-xs px-3 py-2 rounded-l border border-r-0 border-graphite-200 dark:border-graphite-700 bg-graphite-50 dark:bg-graphite-800 text-graphite-500 dark:text-graphite-400 flex items-center">
            /portfolio/
          </span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            onBlur={(e) => setSlug(slugify(e.target.value))}
            placeholder="your-name"
            className="flex-1 text-sm px-3 py-2 rounded-r border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1 dark:text-white">
          Bio
        </label>
        <p className="text-[11px] text-graphite-500 dark:text-graphite-400 mb-1">
          A short intro shown under your name on the portfolio page.
        </p>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="Real estate photographer based in Toronto. Available for listings across the GTA."
          className="w-full text-sm px-3 py-2 rounded border border-graphite-200 dark:border-graphite-700 dark:bg-graphite-800 dark:text-white"
        />
      </div>

      {error && (
        <div className="text-xs px-3 py-2 rounded bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="flex justify-end items-center gap-2">
        {saved && <span className="text-xs text-emerald-600 font-semibold">Saved ✓</span>}
        <button
          onClick={save}
          disabled={saving}
          className="text-xs px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-700 text-white font-semibold disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {savedEnabled && publicUrl && (
        <div className="rounded border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/20 p-3">
          <div className="text-xs font-semibold text-graphite-700 dark:text-graphite-200 mb-1">
            Your public portfolio URL
          </div>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-cyan-700 dark:text-cyan-300 underline break-all"
          >
            {publicUrl}
          </a>
        </div>
      )}
    </div>
  );
}
