"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { AgentPicker, Agent } from "./agent-picker";

type UserPreset = {
  id: string;
  name: string;
  slug: string;
  prompt: string;
  gradient: string | null;
};

type Props = {
  jobId: string;
  initialAddress: string;
  initialPreset: string;
  initialTvStyle: string;
  initialSkyStyle: string;
  initialSeasonalStyle: string | null;
  initialAgentId: string | null;
  initialAgentName: string | null;
  onClose: () => void;
  onSaved: () => void;
};

// Modal for editing an existing job's settings (address, agent, preset,
// TV, sky, seasonal). Also hosts the delete-job affordance. Keeps the UX
// symmetry with NewJobForm without being literally identical — you can't
// change preset/agent on a freshly-created job you haven't populated yet.
export function JobSettingsModal({
  jobId,
  initialAddress,
  initialPreset,
  initialTvStyle,
  initialSkyStyle,
  initialSeasonalStyle,
  initialAgentId,
  initialAgentName,
  onClose,
  onSaved,
}: Props) {
  const router = useRouter();
  const [address, setAddress] = useState(initialAddress);
  const [agent, setAgent] = useState<Agent | null>(
    initialAgentId && initialAgentName ? { id: initialAgentId, name: initialAgentName } : null,
  );
  const [preset, setPreset] = useState<string>(initialPreset);
  const [tvStyle, setTvStyle] = useState<string>(initialTvStyle);
  const [skyStyle, setSkyStyle] = useState<string>(initialSkyStyle);
  const [seasonalStyle, setSeasonalStyle] = useState<string>(initialSeasonalStyle ?? "");
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const res = await fetch("/api/presets", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as unknown;
        if (!cancelled && Array.isArray(data)) setUserPresets(data as UserPreset[]);
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
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function save(): Promise<void> {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          preset,
          tvStyle,
          skyStyle,
          seasonalStyle: seasonalStyle || null,
          agentId: agent?.id ?? null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { error?: string })?.error ?? `Save failed (HTTP ${res.status})`,
        );
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteJob(): Promise<void> {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { error?: string })?.error ?? `Delete failed (HTTP ${res.status})`,
        );
      }
      router.push("/jobs");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl bg-graphite-900 border border-graphite-800 rounded-3xl shadow-2xl my-4">
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-graphite-800">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan mb-1">
              Job settings
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Edit this property
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
        </div>

        <div className="px-6 sm:px-8 py-6 space-y-8">
          {/* Address + Agent */}
          <div className="space-y-5">
            <div>
              <label className="text-[11px] uppercase tracking-[0.2em] text-graphite-500 mb-2 block">
                Property address
              </label>
              <input
                className="w-full h-14 px-5 rounded-2xl bg-graphite-950 border border-graphite-800 text-lg text-white placeholder:text-graphite-600 focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.2em] text-graphite-500 mb-2 block">
                Agent
              </label>
              <AgentPicker value={agent} onChange={setAgent} />
            </div>
          </div>

          {/* Look */}
          <StyleRow title="Look" subtitle="Edit style applied to every photo">
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(presetPreviews) as PresetKey[]).map((k) => (
                <Tile
                  key={k}
                  label={presetPreviews[k].label}
                  selected={preset === k}
                  onClick={() => setPreset(k)}
                >
                  {presetPreviews[k].render()}
                </Tile>
              ))}
            </div>
            {userPresets.length > 0 && (
              <>
                <Divider label="Your presets" />
                <div className="grid grid-cols-3 gap-3">
                  {userPresets.map((p) => (
                    <Tile
                      key={p.id}
                      label={p.name}
                      selected={preset === p.slug}
                      onClick={() => setPreset(p.slug)}
                    >
                      <div
                        className="absolute inset-0"
                        style={{ backgroundImage: p.gradient ?? undefined, backgroundSize: "cover" }}
                      />
                    </Tile>
                  ))}
                </div>
              </>
            )}
          </StyleRow>

          {/* TV */}
          <StyleRow title="TV screen" subtitle="What appears on TVs in the photos">
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {(Object.keys(tvPreviews) as TvKey[]).map((k) => (
                <Tile key={k} label={tvPreviews[k].label} selected={tvStyle === k} onClick={() => setTvStyle(k)}>
                  {tvPreviews[k].render()}
                </Tile>
              ))}
            </div>
          </StyleRow>

          {/* Sky */}
          <StyleRow title="Sky" subtitle="Replaces blown-out or bland skies">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(Object.keys(skyPreviews) as SkyKey[]).map((k) => (
                <Tile key={k} label={skyPreviews[k].label} selected={skyStyle === k} onClick={() => setSkyStyle(k)}>
                  {skyPreviews[k].render()}
                </Tile>
              ))}
            </div>
          </StyleRow>

          {/* Season */}
          <StyleRow title="Season" subtitle="Optional — shifts foliage and lighting">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <Tile label="None" selected={seasonalStyle === ""} onClick={() => setSeasonalStyle("")}>
                <NoneSeasonalPreview />
              </Tile>
              {(Object.keys(seasonalPreviews) as Exclude<SeasonalKey, "">[]).map((k) => (
                <Tile
                  key={k}
                  label={seasonalPreviews[k].label}
                  selected={seasonalStyle === k}
                  onClick={() => setSeasonalStyle(k)}
                >
                  {seasonalPreviews[k].render()}
                </Tile>
              ))}
            </div>
          </StyleRow>

          {error && (
            <div className="text-sm text-red-300 bg-red-950/40 border border-red-900/60 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 sm:px-8 py-4 border-t border-graphite-800">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-300">Delete this job?</span>
              <button
                type="button"
                onClick={() => void deleteJob()}
                disabled={deleting}
                className="h-9 px-4 rounded-lg bg-red-500 text-white text-[13px] font-semibold hover:bg-red-400 disabled:opacity-50 transition"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="h-9 px-3 rounded-lg text-[13px] font-medium text-graphite-400 hover:text-white transition"
              >
                Never mind
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="h-9 px-3 rounded-lg text-[13px] font-medium text-red-300 hover:bg-red-950/30 transition"
            >
              Delete job
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="h-10 px-4 rounded-xl text-sm font-medium text-graphite-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || deleting || !address.trim()}
              className="h-10 px-5 rounded-xl bg-cyan text-graphite-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan/20 transition"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StyleRow({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-graphite-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mt-5 mb-3">
      <div className="h-px bg-graphite-800 flex-1" />
      <span className="text-[10px] uppercase tracking-[0.25em] text-graphite-500">{label}</span>
      <div className="h-px bg-graphite-800 flex-1" />
    </div>
  );
}

function Tile({
  label,
  selected,
  onClick,
  children,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col gap-1.5 rounded-xl p-0.5 transition-all ${
        selected
          ? "ring-2 ring-cyan scale-[1.02] shadow-lg shadow-cyan/15"
          : "ring-1 ring-graphite-800 hover:ring-graphite-600"
      }`}
    >
      <div className="relative w-full aspect-[4/3] rounded-[10px] overflow-hidden">
        {children}
        {selected && (
          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-cyan flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M2 5.5L4 7.5L8 3"
                stroke="#0a0a0b"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
      <span
        className={`text-[11px] font-medium pb-0.5 text-center leading-tight transition-colors ${
          selected ? "text-cyan" : "text-graphite-400 group-hover:text-white"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
