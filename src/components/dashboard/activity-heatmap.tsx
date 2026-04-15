"use client";

import { useEffect, useMemo, useState } from "react";

interface Day {
  date: string; // YYYY-MM-DD
  photos: number;
  jobs: number;
}

interface HeatmapResponse {
  days: Day[];
}

// 6 intensity buckets: 0 = empty, 1..5 = increasing cyan
const LEVEL_CLASSES = [
  "bg-graphite-100 dark:bg-graphite-800",
  "bg-cyan-100 dark:bg-cyan-950",
  "bg-cyan-300 dark:bg-cyan-800",
  "bg-cyan-400 dark:bg-cyan-600",
  "bg-cyan-500 dark:bg-cyan-500",
  "bg-cyan-600 dark:bg-cyan-400",
];

function levelFor(total: number, max: number): number {
  if (total <= 0 || max <= 0) return 0;
  // Log-ish scaling so a few heavy days don't flatten the rest.
  const ratio = Math.min(1, total / max);
  if (ratio > 0.8) return 5;
  if (ratio > 0.6) return 4;
  if (ratio > 0.4) return 3;
  if (ratio > 0.2) return 2;
  return 1;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ActivityHeatmap() {
  const [data, setData] = useState<Day[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<{
    day: Day;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/heatmap", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as HeatmapResponse;
        if (!cancelled) setData(json.days ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
          setData([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build 52 columns x 7 rows grid, aligned so the last column ends on "today".
  const { weeks, monthLabels, totals, max } = useMemo(() => {
    if (!data) {
      return {
        weeks: [] as (Day | null)[][],
        monthLabels: [] as { col: number; label: string }[],
        totals: { photos: 0, jobs: 0 },
        max: 0,
      };
    }

    // Use only the last 52*7 = 364 days so we fit cleanly.
    const trimmed = data.slice(-364);

    // Pad at the beginning so Sunday is row 0 of column 0.
    // Assume week starts on Sunday (getDay() === 0).
    const firstDate = trimmed.length
      ? new Date(trimmed[0].date + "T00:00:00")
      : new Date();
    const leadPad = firstDate.getDay(); // 0..6
    const cells: (Day | null)[] = [];
    for (let i = 0; i < leadPad; i++) cells.push(null);
    cells.push(...trimmed);

    // Chunk into 7-day columns.
    const cols: (Day | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      cols.push(cells.slice(i, i + 7));
    }
    // Cap at 52 columns.
    const clampedCols = cols.slice(-52);

    // Month labels: show month name on the first column of each month.
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    clampedCols.forEach((col, idx) => {
      const firstDay = col.find((c) => c) as Day | undefined;
      if (!firstDay) return;
      const m = new Date(firstDay.date + "T00:00:00").getMonth();
      if (m !== lastMonth) {
        labels.push({
          col: idx,
          label: new Date(firstDay.date + "T00:00:00").toLocaleDateString(
            undefined,
            { month: "short" }
          ),
        });
        lastMonth = m;
      }
    });

    let maxTotal = 0;
    let totalPhotos = 0;
    let totalJobs = 0;
    for (const d of trimmed) {
      const t = d.photos + d.jobs;
      if (t > maxTotal) maxTotal = t;
      totalPhotos += d.photos;
      totalJobs += d.jobs;
    }

    return {
      weeks: clampedCols,
      monthLabels: labels,
      totals: { photos: totalPhotos, jobs: totalJobs },
      max: maxTotal,
    };
  }, [data]);

  const loading = data === null && !error;

  return (
    <div className="relative bg-white dark:bg-graphite-900 rounded-lg border border-graphite-100 dark:border-graphite-800 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-graphite-900 dark:text-white">
          Activity heatmap
        </h3>
        <span className="text-[10px] uppercase tracking-wide font-semibold text-cyan-600 dark:text-cyan-400">
          Last 12 months
        </span>
      </div>

      {loading ? (
        <div className="h-[140px] flex items-center justify-center text-xs text-graphite-400">
          Loading activity...
        </div>
      ) : (
        <>
          <div className="text-[11px] text-graphite-500 dark:text-graphite-400 mb-2">
            {totals.photos.toLocaleString()} photos and{" "}
            {totals.jobs.toLocaleString()} jobs created in the last year
          </div>

          <div className="overflow-x-auto">
            <div className="inline-block">
              {/* Month labels row */}
              <div
                className="grid gap-[3px] mb-1 ml-[22px]"
                style={{
                  gridTemplateColumns: `repeat(${weeks.length}, 11px)`,
                }}
              >
                {weeks.map((_, colIdx) => {
                  const label = monthLabels.find((l) => l.col === colIdx);
                  return (
                    <div
                      key={colIdx}
                      className="h-3 text-[9px] text-graphite-400 dark:text-graphite-500 leading-none"
                    >
                      {label ? label.label : ""}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-[3px]">
                {/* Weekday labels column */}
                <div className="flex flex-col gap-[3px] mr-1 text-[9px] text-graphite-400 dark:text-graphite-500 leading-[11px] w-[18px]">
                  <div className="h-[11px]" />
                  <div className="h-[11px]">Mon</div>
                  <div className="h-[11px]" />
                  <div className="h-[11px]">Wed</div>
                  <div className="h-[11px]" />
                  <div className="h-[11px]">Fri</div>
                  <div className="h-[11px]" />
                </div>

                {/* Grid */}
                <div
                  className="grid gap-[3px]"
                  style={{
                    gridTemplateColumns: `repeat(${weeks.length}, 11px)`,
                    gridTemplateRows: "repeat(7, 11px)",
                    gridAutoFlow: "column",
                  }}
                  onMouseLeave={() => setHover(null)}
                >
                  {weeks.flatMap((col, colIdx) =>
                    col.map((cell, rowIdx) => {
                      if (!cell) {
                        return (
                          <div
                            key={`${colIdx}-${rowIdx}`}
                            className="w-[11px] h-[11px] rounded-[2px] bg-transparent"
                          />
                        );
                      }
                      const total = cell.photos + cell.jobs;
                      const lvl = levelFor(total, max);
                      return (
                        <div
                          key={`${colIdx}-${rowIdx}`}
                          className={`w-[11px] h-[11px] rounded-[2px] ${LEVEL_CLASSES[lvl]} ring-inset ring-graphite-200/30 dark:ring-graphite-700/40 ring-[0.5px] cursor-pointer transition-transform hover:scale-125`}
                          onMouseEnter={(e) => {
                            const rect = (
                              e.currentTarget as HTMLElement
                            ).getBoundingClientRect();
                            const parent = (
                              e.currentTarget.offsetParent as HTMLElement | null
                            )?.getBoundingClientRect();
                            setHover({
                              day: cell,
                              x:
                                rect.left -
                                (parent?.left ?? 0) +
                                rect.width / 2,
                              y: rect.top - (parent?.top ?? 0) - 6,
                            });
                          }}
                        />
                      );
                    })
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-2 mt-3 ml-[22px] text-[10px] text-graphite-500 dark:text-graphite-400">
                <span>Less</span>
                {LEVEL_CLASSES.map((cls, i) => (
                  <div
                    key={i}
                    className={`w-[11px] h-[11px] rounded-[2px] ${cls}`}
                  />
                ))}
                <span>More</span>
              </div>
            </div>
          </div>

          {hover && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-graphite-900 dark:bg-graphite-800 px-2 py-1 text-[11px] text-white shadow-lg ring-1 ring-graphite-700"
              style={{ left: hover.x, top: hover.y }}
            >
              <div className="font-semibold">
                {formatDateLabel(hover.day.date)}
              </div>
              <div className="text-graphite-300">
                {hover.day.photos} photo{hover.day.photos === 1 ? "" : "s"},{" "}
                {hover.day.jobs} job{hover.day.jobs === 1 ? "" : "s"}
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="mt-2 text-[11px] text-red-500">
          Could not load activity: {error}
        </div>
      )}
    </div>
  );
}
