import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: ReactNode;
  /** When passed, renders a thin progress bar under the value. 0–100. */
  progress?: number;
  /** API compat — unused. */
  iconColor?: "amber" | "cyan" | "green" | "purple";
  /** API compat — unused. */
  highlight?: boolean;
}

export function StatCard({ label, value, subtext, icon, progress }: StatCardProps) {
  return (
    <div className="rounded-lg bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-800 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="text-[11px] font-medium uppercase tracking-wider text-graphite-500 dark:text-graphite-400">
          {label}
        </div>
        <div className="w-7 h-7 rounded-md bg-graphite-100 dark:bg-graphite-800 text-graphite-500 dark:text-graphite-400 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-semibold tracking-tight text-graphite-900 dark:text-white tabular-nums">
        {value}
      </div>
      {subtext && (
        <div className="text-xs text-graphite-500 dark:text-graphite-400 mt-1.5">{subtext}</div>
      )}
      {typeof progress === "number" && (
        <div className="h-1 w-full bg-graphite-100 dark:bg-graphite-800 rounded-full mt-4 overflow-hidden">
          <div
            className="h-1 bg-cyan-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
