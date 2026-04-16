"use client";

import { useState } from "react";
import { PresetEditor, UserPreset } from "./preset-editor";

type Props = {
  initialPresets: UserPreset[];
};

const BUILTINS: { slug: string; label: string; gradientCss: string }[] = [
  {
    slug: "standard",
    label: "Standard",
    gradientCss: "linear-gradient(135deg,#475569 0%,#94a3b8 50%,#a5f3fc 100%)",
  },
  {
    slug: "bright-airy",
    label: "Bright & Airy",
    gradientCss: "linear-gradient(135deg,#ffffff 0%,#e0f2fe 50%,#fef3c7 100%)",
  },
  {
    slug: "flambient-hdr",
    label: "Flambient HDR",
    gradientCss: "linear-gradient(135deg,#0f172a 0%,#475569 55%,#fde68a 100%)",
  },
];

export function PresetsManager({ initialPresets }: Props) {
  const [presets, setPresets] = useState<UserPreset[]>(initialPresets);
  const [editing, setEditing] = useState<UserPreset | null>(null);
  const [creating, setCreating] = useState(false);

  function onSaved(p: UserPreset) {
    setPresets((xs) => {
      const existing = xs.find((x) => x.id === p.id);
      if (existing) return xs.map((x) => (x.id === p.id ? p : x));
      return [...xs, p];
    });
  }
  function onDeleted(id: string) {
    setPresets((xs) => xs.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-10">
      {/* Built-ins — read-only reference */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[11px] uppercase tracking-[0.25em] text-graphite-500">
            Built-in
          </h2>
          <span className="text-[11px] text-graphite-600 tabular-nums">
            {BUILTINS.length} preset{BUILTINS.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {BUILTINS.map((b) => (
            <div
              key={b.slug}
              className="relative rounded-3xl bg-graphite-900 border border-graphite-800 overflow-hidden opacity-80"
            >
              <div
                className="relative aspect-[16/9]"
                style={{ backgroundImage: b.gradientCss }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-white/70 mb-1">
                    Built-in
                  </div>
                  <div className="text-lg font-semibold text-white tracking-tight">{b.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* User presets + create tile */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[11px] uppercase tracking-[0.25em] text-graphite-500">
            Your presets
          </h2>
          <span className="text-[11px] text-graphite-600 tabular-nums">
            {presets.length} preset{presets.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditing(null);
            }}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan/15 via-cyan/5 to-transparent border border-cyan/30 hover:border-cyan/60 transition-all aspect-[16/9] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(34,211,238,0.22),transparent_55%)] opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="relative text-center">
              <div className="mx-auto w-11 h-11 rounded-full bg-cyan text-graphite-950 flex items-center justify-center shadow-lg shadow-cyan/30 mb-3 group-hover:scale-110 transition-transform">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 9H15M9 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-base font-semibold text-white">New preset</div>
              <div className="text-xs text-graphite-400 mt-0.5">Custom prompt, custom tile</div>
            </div>
          </button>

          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setEditing(p);
                setCreating(false);
              }}
              className="group relative rounded-3xl border border-graphite-800 bg-graphite-900 overflow-hidden text-left hover:border-graphite-700 transition-all"
            >
              <div
                className="relative aspect-[16/9]"
                style={{
                  backgroundImage: p.gradient ?? fallbackGradient(p.id),
                  backgroundSize: "cover",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-white/70 mb-1">
                    Custom
                  </div>
                  <div className="text-lg font-semibold text-white tracking-tight truncate">
                    {p.name}
                  </div>
                </div>
                <div className="absolute top-3 right-3 text-[10px] uppercase tracking-[0.2em] text-white/70 bg-black/40 backdrop-blur px-2 py-1 rounded-full">
                  Edit
                </div>
              </div>
              <div className="p-4 border-t border-graphite-800">
                <p className="text-xs text-graphite-400 line-clamp-3 leading-relaxed">
                  {p.prompt.slice(0, 180)}
                  {p.prompt.length > 180 ? "…" : ""}
                </p>
              </div>
            </button>
          ))}
        </div>

        {presets.length === 0 && (
          <p className="mt-4 text-sm text-graphite-500">
            You haven&apos;t created any custom presets yet. Hit{" "}
            <span className="text-cyan">New preset</span> to craft your first look.
          </p>
        )}
      </section>

      <PresetEditor
        open={creating || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={onSaved}
        onDeleted={onDeleted}
        initial={editing}
      />
    </div>
  );
}

// Deterministic fallback gradient when the user didn't pick one.
function fallbackGradient(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const hue1 = hash % 360;
  const hue2 = (hue1 + 45) % 360;
  const hue3 = (hue1 + 180) % 360;
  return `linear-gradient(135deg, hsl(${hue1} 55% 22%), hsl(${hue2} 55% 42%), hsl(${hue3} 70% 72%))`;
}
