import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: ReactNode;
  /** Kept for API compatibility — unused (one accent color only). */
  iconColor?: "amber" | "cyan" | "green" | "purple";
  /** Dark inverted variant for a single emphasized stat. */
  highlight?: boolean;
}

export function StatCard({ label, value, subtext, icon, highlight = false }: StatCardProps) {
  if (highlight) {
    return (
      <div className="relative overflow-hidden rounded-lg bg-graphite-900 dark:bg-white p-5">
        <div className="text-[11px] font-medium uppercase tracking-wider text-white/60 dark:text-graphite-500 mb-3">
          {label}
        </div>
        <div className="text-3xl font-semibold tracking-tight text-white dark:text-graphite-900 tabular-nums">
          {value}
        </div>
        {subtext && (
          <div className="text-xs text-white/50 dark:text-graphite-500 mt-1.5">{subtext}</div>
        )}
        <div className="absolute top-4 right-4 w-8 h-8 rounded-md bg-white/10 dark:bg-graphite-900/10 text-white dark:text-graphite-900 flex items-center justify-center">
          {icon}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-800 p-5">
      <div className="text-[11px] font-medium uppercase tracking-wider text-graphite-500 dark:text-graphite-400 mb-3">
        {label}
      </div>
      <div className="text-3xl font-semibold tracking-tight text-graphite-900 dark:text-white tabular-nums">
        {value}
      </div>
      {subtext && (
        <div className="text-xs text-graphite-500 dark:text-graphite-400 mt-1.5">{subtext}</div>
      )}
      <div className="absolute top-4 right-4 w-8 h-8 rounded-md bg-graphite-100 dark:bg-graphite-800 text-graphite-500 dark:text-graphite-400 flex items-center justify-center">
        {icon}
      </div>
    </div>
  );
}
