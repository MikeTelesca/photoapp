"use client";

import { useEffect, useState } from "react";
import {
  PresetKey,
  TvKey,
  SkyKey,
  SeasonalKey,
  presetPreviews,
  tvPreviews,
  skyPreviews,
  seasonalPreviews,
  NoneSeasonalPreview,
} from "./style-previews";
import { InheritTile, StyleTile, TileSection, fallbackGradient } from "./style-tile";

type UserPreset = {
  id: string;
  name: string;
  slug: string;
  prompt: string;
  gradient: string | null;
};

export type PhotoOverrides = {
  preset: string | null;
  tvStyle: string | null;
  skyStyle: string | null;
  seasonalStyle: string | null;
  customInstructions: string | null;
};

export type JobDefaults = {
  preset: string;
  tvStyle: string;
  skyStyle: string;
  seasonalStyle: string | null;
};

type Props = {
  jobDefaults: JobDefaults;
  photoOverrides: PhotoOverrides;
  photoOrderIndex: number;
  onClose: () => void;
  onSave: (overrides: PhotoOverrides) => Promise<void>;
  onEnhance?: () => void;
};

// null means "inherit from job". We keep the selection local until the user
// clicks Save — cancel throws away the changes.
type Draft = {
  preset: string | null;
  tvStyle: string | null;
  skyStyle: string | null;
  seasonalStyle: string | null;
  customInstructions: string;
};

export function PhotoSettingsModal({
  jobDefaults,
  photoOverrides,
  photoOrderIndex,
  onClose,
  onSave,
  onEnhance,
}: Props) {
  const [draft, setDraft] = useState<Draft>({
    preset: photoOverrides.preset,
    tvStyle: photoOverrides.tvStyle,
    skyStyle: photoOverrides.skyStyle,
    seasonalStyle: photoOverrides.seasonalStyle,
    customInstructions: photoOverrides.customInstructions ?? "",
  });
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/presets", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as unknown;
        if (!cancelled && Array.isArray(data)) {
          setUserPresets(data as UserPreset[]);
        }
      } catch {
        /* non-fatal */
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function commit(runEnhance: boolean) {
    setSaving(true);
    setError("");
    try {
      const trimmed = draft.customInstructions.trim();
      await onSave({
        preset: draft.preset,
        tvStyle: draft.tvStyle,
        skyStyle: draft.skyStyle,
        seasonalStyle: draft.seasonalStyle,
        customInstructions: trimmed === "" ? null : trimmed,
      });
      if (runEnhance && onEnhance) onEnhance();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${photoOrderIndex + 1} settings`}
      className="fixed inset-0 z-[60] bg-graphite-950/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-full flex items-start justify-center py-10 px-4">
        <div
          className="w-full max-w-3xl rounded-3xl border border-graphite-800 bg-graphite-900 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-graphite-800">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-graphite-500">
                Per-photo overrides
              </div>
              <h2 className="text-2xl font-semibold mt-1.5 text-white">
                Photo #{photoOrderIndex + 1} settings
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 rounded-full border border-graphite-800 text-graphite-400 hover:text-white hover:border-graphite-600 transition flex items-center justify-center"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 2L12 12M12 2L2 12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>

          <div className="px-7 py-6 space-y-8">
            <TileSection title="Look" subtitle="Edit style for this photo only">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                <InheritTile
                  selected={draft.preset === null}
                  onClick={() => setDraft((d) => ({ ...d, preset: null }))}
                  defaultLabel={`Same as job (${prettyPreset(jobDefaults.preset, userPresets)})`}
                />
                {(Object.keys(presetPreviews) as PresetKey[]).map((k) => (
                  <StyleTile
                    key={k}
                    label={presetPreviews[k].label}
                    selected={draft.preset === k}
                    onClick={() => setDraft((d) => ({ ...d, preset: k }))}
                    aspect="aspect-[4/3]"
                  >
                    {presetPreviews[k].render()}
                  </StyleTile>
                ))}
                {userPresets.map((p) => (
                  <StyleTile
                    key={p.id}
                    label={p.name}
                    selected={draft.preset === p.slug}
                    onClick={() => setDraft((d) => ({ ...d, preset: p.slug }))}
                    aspect="aspect-[4/3]"
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: p.gradient ?? fallbackGradient(p.id),
                        backgroundSize: "cover",
                      }}
                    />
                  </StyleTile>
                ))}
              </div>
            </TileSection>

            <TileSection title="TV screen">
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                <InheritTile
                  compact
                  selected={draft.tvStyle === null}
                  onClick={() => setDraft((d) => ({ ...d, tvStyle: null }))}
                  defaultLabel={`Same (${prettyTv(jobDefaults.tvStyle)})`}
                />
                {(Object.keys(tvPreviews) as TvKey[]).map((k) => (
                  <StyleTile
                    key={k}
                    label={tvPreviews[k].label}
                    selected={draft.tvStyle === k}
                    onClick={() => setDraft((d) => ({ ...d, tvStyle: k }))}
                    aspect="aspect-[4/3]"
                  >
                    {tvPreviews[k].render()}
                  </StyleTile>
                ))}
              </div>
            </TileSection>

            <TileSection title="Sky">
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                <InheritTile
                  compact
                  selected={draft.skyStyle === null}
                  onClick={() => setDraft((d) => ({ ...d, skyStyle: null }))}
                  defaultLabel={`Same (${prettySky(jobDefaults.skyStyle)})`}
                />
                {(Object.keys(skyPreviews) as SkyKey[]).map((k) => (
                  <StyleTile
                    key={k}
                    label={skyPreviews[k].label}
                    selected={draft.skyStyle === k}
                    onClick={() => setDraft((d) => ({ ...d, skyStyle: k }))}
                    aspect="aspect-square"
                  >
                    {skyPreviews[k].render()}
                  </StyleTile>
                ))}
              </div>
            </TileSection>

            <TileSection title="Season">
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                <InheritTile
                  compact
                  selected={draft.seasonalStyle === null}
                  onClick={() => setDraft((d) => ({ ...d, seasonalStyle: null }))}
                  defaultLabel={`Same (${prettySeason(jobDefaults.seasonalStyle)})`}
                />
                <StyleTile
                  label="None"
                  selected={draft.seasonalStyle === ""}
                  onClick={() => setDraft((d) => ({ ...d, seasonalStyle: "" }))}
                  aspect="aspect-square"
                >
                  <NoneSeasonalPreview />
                </StyleTile>
                {(Object.keys(seasonalPreviews) as Exclude<SeasonalKey, "">[]).map((k) => (
                  <StyleTile
                    key={k}
                    label={seasonalPreviews[k].label}
                    selected={draft.seasonalStyle === k}
                    onClick={() => setDraft((d) => ({ ...d, seasonalStyle: k }))}
                    aspect="aspect-square"
                  >
                    {seasonalPreviews[k].render()}
                  </StyleTile>
                ))}
              </div>
            </TileSection>

            <section>
              <label className="text-[11px] uppercase tracking-[0.2em] text-graphite-500 mb-2 block">
                Custom instructions
              </label>
              <textarea
                value={draft.customInstructions}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, customInstructions: e.target.value }))
                }
                placeholder="e.g. Tone down the couch. Make sure the TV shows something warm."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-graphite-950 border border-graphite-800 text-sm text-white placeholder:text-graphite-600 focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition resize-none"
              />
            </section>

            {error && (
              <div className="text-sm text-red-300 bg-red-950/40 border border-red-900/60 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
          </div>

          <footer className="flex justify-end gap-3 px-7 py-5 border-t border-graphite-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 px-5 rounded-xl text-sm font-medium text-graphite-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void commit(false)}
              disabled={saving}
              className="h-10 px-5 rounded-xl border border-graphite-700 bg-graphite-800 text-sm font-semibold text-white hover:border-graphite-600 transition disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {onEnhance && (
              <button
                type="button"
                onClick={() => void commit(true)}
                disabled={saving}
                className="h-10 px-5 rounded-xl bg-cyan text-graphite-950 text-sm font-semibold hover:bg-cyan-400 transition disabled:opacity-40 shadow-lg shadow-cyan/20"
              >
                Save &amp; Re-enhance
              </button>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}

function prettyPreset(slug: string, userPresets: UserPreset[]): string {
  const builtin: Record<string, string> = {
    standard: "Standard",
    "bright-airy": "Bright & Airy",
    "flambient-hdr": "Flambient HDR",
    "mls-standard": "MLS Standard",
    flambient: "Flambient",
  };
  if (builtin[slug]) return builtin[slug];
  const user = userPresets.find((p) => p.slug === slug);
  return user?.name ?? slug;
}

function prettyTv(slug: string): string {
  const map: Record<string, string> = {
    netflix: "Netflix",
    black: "Black",
    beach: "Beach",
    mountains: "Mountains",
    fireplace: "Fireplace",
    art: "Art",
    off: "Off",
  };
  return map[slug] ?? slug;
}

function prettySky(slug: string): string {
  const map: Record<string, string> = {
    "blue-clouds": "Blue + Clouds",
    "clear-blue": "Clear Blue",
    "golden-hour": "Golden Hour",
    dramatic: "Dramatic",
    "overcast-soft": "Overcast",
    "as-is": "As-Is",
  };
  return map[slug] ?? slug;
}

function prettySeason(slug: string | null): string {
  if (!slug) return "None";
  const map: Record<string, string> = {
    spring: "Spring",
    summer: "Summer",
    autumn: "Autumn",
    winter: "Winter",
    twilight: "Twilight",
  };
  return map[slug] ?? slug;
}
