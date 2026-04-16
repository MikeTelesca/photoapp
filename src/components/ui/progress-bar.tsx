interface ProgressBarProps {
  value: number;
  color?: "amber" | "cyan" | "green" | "red" | "violet";
  /** "thin" = 4px (was original), "md" = 6px, "lg" = 10px (richer status bar). */
  size?: "thin" | "md" | "lg";
  /** Pass a `w-*` class to override the default 72px width. */
  className?: string;
}

const colorClass: Record<string, string> = {
  amber:  "bg-amber-500",
  cyan:   "bg-cyan-500",
  green:  "bg-emerald-500",
  red:    "bg-red-500",
  violet: "bg-violet-500",
};

const heightClass: Record<string, string> = {
  thin: "h-1",
  md:   "h-1.5",
  lg:   "h-2",
};

export function ProgressBar({
  value,
  color = "cyan",
  size = "thin",
  className = "",
}: ProgressBarProps) {
  const h = heightClass[size];
  const hasWidth = /\bw-/.test(className);
  return (
    <div
      className={`${hasWidth ? "" : "w-[72px]"} ${h} bg-graphite-200 dark:bg-graphite-800 rounded-full overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`${h} ${colorClass[color]} rounded-full transition-all duration-300 relative overflow-hidden`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      >
        {/* subtle sheen on active bars — matches inspo #5 motion */}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[shimmer_2s_linear_infinite]"
          style={{ backgroundSize: "200% 100%" }}
        />
      </div>
    </div>
  );
}
