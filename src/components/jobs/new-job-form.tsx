"use client";

import { ReactNode, useState } from "react";
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

export function NewJobForm({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [dropboxUrl, setDropboxUrl] = useState("");
  const [preset, setPreset] = useState<PresetKey>("standard");
  const [tvStyle, setTvStyle] = useState<TvKey>("netflix");
  const [skyStyle, setSkyStyle] = useState<SkyKey>("blue-clouds");
  const [seasonalStyle, setSeasonalStyle] = useState<SeasonalKey>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          dropboxUrl: dropboxUrl || null,
          preset,
          tvStyle,
          skyStyle,
          seasonalStyle: seasonalStyle || null,
        }),
      });

      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        const msg =
          body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Failed to create job";
        throw new Error(msg);
      }

      const job: unknown = await res.json();
      if (job && typeof job === "object" && "id" in job && typeof (job as { id: unknown }).id === "string") {
        router.push(`/job/${(job as { id: string }).id}`);
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Address + Dropbox — the primary inputs, oversized hero feel */}
      <div className="space-y-6">
        <div>
          <label className="text-[11px] uppercase tracking-[0.2em] text-graphite-500 mb-2 block">
            Property address
          </label>
          <input
            className="w-full h-14 px-5 rounded-2xl bg-graphite-950 border border-graphite-800 text-lg text-white placeholder:text-graphite-600 focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="1247 N Main St, Denver CO"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-[0.2em] text-graphite-500 mb-2 block">
            Dropbox link <span className="text-graphite-600 normal-case tracking-normal">— optional</span>
          </label>
          <input
            className="w-full h-11 px-4 rounded-xl bg-graphite-950 border border-graphite-800 text-sm text-white placeholder:text-graphite-600 focus:outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20 transition"
            value={dropboxUrl}
            onChange={(e) => setDropboxUrl(e.target.value)}
            placeholder="https://www.dropbox.com/scl/fo/..."
            type="url"
          />
        </div>
      </div>

      <TileSection title="Look" subtitle="Edit style applied to every photo">
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(presetPreviews) as PresetKey[]).map((k) => (
            <StyleTile
              key={k}
              label={presetPreviews[k].label}
              selected={preset === k}
              onClick={() => setPreset(k)}
              aspect="aspect-[4/3]"
            >
              {presetPreviews[k].render()}
            </StyleTile>
          ))}
        </div>
      </TileSection>

      <TileSection title="TV screen" subtitle="What appears on TVs in the photos">
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {(Object.keys(tvPreviews) as TvKey[]).map((k) => (
            <StyleTile
              key={k}
              label={tvPreviews[k].label}
              selected={tvStyle === k}
              onClick={() => setTvStyle(k)}
              aspect="aspect-[4/3]"
            >
              {tvPreviews[k].render()}
            </StyleTile>
          ))}
        </div>
      </TileSection>

      <TileSection title="Sky" subtitle="Replaces blown-out or bland skies">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(Object.keys(skyPreviews) as SkyKey[]).map((k) => (
            <StyleTile
              key={k}
              label={skyPreviews[k].label}
              selected={skyStyle === k}
              onClick={() => setSkyStyle(k)}
              aspect="aspect-square"
            >
              {skyPreviews[k].render()}
            </StyleTile>
          ))}
        </div>
      </TileSection>

      <TileSection title="Season" subtitle="Optional — shifts foliage and lighting">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <StyleTile
            label="None"
            selected={seasonalStyle === ""}
            onClick={() => setSeasonalStyle("")}
            aspect="aspect-square"
          >
            <NoneSeasonalPreview />
          </StyleTile>
          {(Object.keys(seasonalPreviews) as Exclude<SeasonalKey, "">[]).map((k) => (
            <StyleTile
              key={k}
              label={seasonalPreviews[k].label}
              selected={seasonalStyle === k}
              onClick={() => setSeasonalStyle(k)}
              aspect="aspect-square"
            >
              {seasonalPreviews[k].render()}
            </StyleTile>
          ))}
        </div>
      </TileSection>

      {error && (
        <div className="text-sm text-red-300 bg-red-950/40 border border-red-900/60 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 rounded-xl text-sm font-medium text-graphite-400 hover:text-white transition"
            disabled={loading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading || !address}
          className="h-11 px-6 rounded-xl bg-cyan text-graphite-950 text-sm font-semibold hover:bg-cyan-400 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan/20"
        >
          {loading ? "Creating…" : "Create job →"}
        </button>
      </div>
    </form>
  );
}

function TileSection({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
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

function StyleTile({
  label,
  selected,
  onClick,
  aspect,
  children,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  aspect: string;
  children: ReactNode;
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
      <div className={`relative w-full ${aspect} rounded-[10px] overflow-hidden`}>
        {children}
        {selected && (
          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-cyan flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5.5L4 7.5L8 3" stroke="#0a0a0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
