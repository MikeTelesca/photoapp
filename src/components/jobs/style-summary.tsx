import {
  PresetKey,
  TvKey,
  SkyKey,
  SeasonalKey,
  presetPreviews,
  tvPreviews,
  skyPreviews,
  seasonalPreviews,
} from "./style-previews";

// Compact inline display of the style combo chosen for a job.
// Shown in the hero of /job/[jobId] under the address.

export function StyleSummary({
  preset,
  tvStyle,
  skyStyle,
  seasonalStyle,
}: {
  preset: string;
  tvStyle: string;
  skyStyle: string;
  seasonalStyle: string | null;
}) {
  const items: { label: string; children: React.ReactNode }[] = [];

  const p = presetPreviews[preset as PresetKey];
  if (p) items.push({ label: p.label, children: p.render() });

  const tv = tvPreviews[tvStyle as TvKey];
  if (tv) items.push({ label: tv.label, children: tv.render() });

  const sky = skyPreviews[skyStyle as SkyKey];
  if (sky) items.push({ label: sky.label, children: sky.render() });

  if (seasonalStyle) {
    const season = seasonalPreviews[seasonalStyle as Exclude<SeasonalKey, "">];
    if (season) items.push({ label: season.label, children: season.render() });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {items.map((it, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-2 pr-3 pl-1 py-1 rounded-full bg-graphite-900 border border-graphite-800 text-[11px] font-medium text-graphite-300"
        >
          <span className="relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
            {it.children}
          </span>
          {it.label}
        </span>
      ))}
    </div>
  );
}
