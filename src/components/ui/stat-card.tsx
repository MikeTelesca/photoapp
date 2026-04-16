import { ReactNode } from "react";

export type StatAccent = "cyan" | "violet" | "emerald" | "amber" | "rose" | "sky" | "graphite";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: ReactNode;
  /** When passed, renders a thin progress bar under the value. 0–100. */
  progress?: number;
  /** Delta/trend chip, e.g. { value: "+12%", direction: "up" } */
  delta?: { value: string; direction: "up" | "down" | "neutral" };
  /** Tiny line chart under the value. Pass raw numbers; auto-scaled. */
  sparkline?: number[];
  /** Accent color — drives gradient tint in top-right, icon bg, sparkline stroke. */
  accent?: StatAccent;
  /** API compat — mapped to accent. */
  iconColor?: "amber" | "cyan" | "green" | "purple";
  /** API compat — unused. */
  highlight?: boolean;
}

const accentGradient: Record<StatAccent, string> = {
  cyan: "from-cyan-500/20",
  violet: "from-violet-500/20",
  emerald: "from-emerald-500/20",
  amber: "from-amber-500/20",
  rose: "from-rose-500/20",
  sky: "from-sky-500/20",
  graphite: "from-graphite-500/10",
};

const accentIconBg: Record<StatAccent, string> = {
  cyan: "bg-cyan-500/15 text-cyan dark:text-cyan-light",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  graphite: "bg-graphite-100 dark:bg-graphite-800 text-graphite-500 dark:text-graphite-400",
};

const accentStroke: Record<StatAccent, string> = {
  cyan: "stroke-cyan-400",
  violet: "stroke-violet-400",
  emerald: "stroke-emerald-400",
  amber: "stroke-amber-400",
  rose: "stroke-rose-400",
  sky: "stroke-sky-400",
  graphite: "stroke-graphite-400",
};

const legacyIconMap: Record<string, StatAccent> = {
  amber: "amber",
  cyan: "cyan",
  green: "emerald",
  purple: "violet",
};

export function StatCard({
  label,
  value,
  subtext,
  icon,
  progress,
  delta,
  sparkline,
  accent,
  iconColor,
}: StatCardProps) {
  const a: StatAccent = accent ?? (iconColor ? legacyIconMap[iconColor] : "graphite");
  return (
    <div className="relative overflow-hidden rounded-xl bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-800 p-5">
      <div
        className={`pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${accentGradient[a]} to-transparent blur-2xl`}
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between mb-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-graphite-500 dark:text-graphite-400">
          {label}
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentIconBg[a]}`}>
          {icon}
        </div>
      </div>
      <div className="relative text-3xl font-semibold tracking-tight text-graphite-900 dark:text-white tabular-nums">
        {value}
      </div>
      <div className="relative mt-1.5 flex items-center gap-2 text-xs min-h-[16px]">
        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 font-semibold ${
              delta.direction === "up"
                ? "text-emerald-600 dark:text-emerald-400"
                : delta.direction === "down"
                ? "text-red-600 dark:text-red-400"
                : "text-graphite-500 dark:text-graphite-400"
            }`}
          >
            {delta.direction === "up" && "▲"}
            {delta.direction === "down" && "▼"}
            {delta.value}
          </span>
        )}
        {subtext && (
          <span className="text-graphite-500 dark:text-graphite-400">{subtext}</span>
        )}
      </div>
      {sparkline && sparkline.length > 1 && (
        <div className="relative mt-3">
          <Sparkline data={sparkline} strokeClass={accentStroke[a]} />
        </div>
      )}
      {typeof progress === "number" && (
        <div className="relative h-1 w-full bg-graphite-100 dark:bg-graphite-800 rounded-full mt-4 overflow-hidden">
          <div
            className="h-1 bg-cyan-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

function Sparkline({ data, strokeClass }: { data: number[]; strokeClass: string }) {
  const w = 120;
  const h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? w / (data.length - 1) : 0;
  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const d = `M ${points.join(" L ")}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full h-7"
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        className={strokeClass}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
