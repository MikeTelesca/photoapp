interface ProgressBarProps {
  value: number;
  color?: "amber" | "cyan" | "green";
  className?: string;
}

const colors: Record<string, string> = {
  amber: "bg-amber-500",
  cyan: "bg-gradient-to-r from-cyan to-cyan-light",
  green: "bg-emerald-500",
};

export function ProgressBar({ value, color = "amber", className = "" }: ProgressBarProps) {
  return (
    <div className={`w-[72px] h-1 bg-graphite-100 rounded-sm ${className}`}>
      <div
        className={`h-1 rounded-sm transition-all duration-300 ${colors[color]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
