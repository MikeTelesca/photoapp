import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: ReactNode;
  iconColor?: "amber" | "cyan" | "green" | "purple";
  highlight?: boolean;
}

const iconBg: Record<string, string> = {
  amber: "bg-amber-100 text-amber-600",
  cyan: "bg-cyan-50 text-cyan",
  green: "bg-emerald-100 text-emerald-600",
  purple: "bg-purple-100 text-purple-600",
};

export function StatCard({ label, value, subtext, icon, iconColor = "cyan", highlight = false }: StatCardProps) {
  if (highlight) {
    return (
      <div className="bg-gradient-to-br from-graphite-900 to-graphite-800 rounded-card p-5 relative overflow-hidden shadow-lg hover:-translate-y-0.5 transition-all duration-250">
        <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">{label}</div>
        <div className="text-[32px] font-extrabold text-white tracking-tight tabular-nums">{value}</div>
        {subtext && <div className="text-xs text-white/50 mt-1.5">{subtext}</div>}
        <div className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-white/10 text-cyan-light flex items-center justify-center">{icon}</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-graphite-900 rounded-card border border-graphite-200 dark:border-graphite-800 p-5 relative overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all duration-250">
      <div className="text-xs font-semibold text-graphite-400 uppercase tracking-wider mb-3">{label}</div>
      <div className="text-[32px] font-extrabold text-graphite-900 dark:text-white tracking-tight tabular-nums">{value}</div>
      {subtext && <div className="text-xs text-graphite-400 mt-1.5">{subtext}</div>}
      <div className={`absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center ${iconBg[iconColor]}`}>{icon}</div>
    </div>
  );
}
