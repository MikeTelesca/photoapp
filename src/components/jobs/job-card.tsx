import Link from "next/link";

const statusStyles: Record<string, { label: string; dot: string; text: string }> = {
  pending: { label: "Pending", dot: "bg-graphite-400", text: "text-graphite-300" },
  processing: { label: "Processing", dot: "bg-cyan animate-pulse", text: "text-cyan" },
  review: { label: "Review", dot: "bg-amber-400", text: "text-amber-300" },
  approved: { label: "Approved", dot: "bg-emerald-400", text: "text-emerald-300" },
  rejected: { label: "Rejected", dot: "bg-red-400", text: "text-red-300" },
};

// Deterministic gradient when no photo exists — based on job id characters so
// each job has its own consistent placeholder colour.
function gradientForId(id: string): string {
  const palette = [
    "from-indigo-900 via-purple-800 to-rose-700",
    "from-cyan-900 via-sky-800 to-emerald-700",
    "from-amber-900 via-orange-800 to-red-700",
    "from-fuchsia-900 via-violet-800 to-indigo-700",
    "from-teal-900 via-emerald-800 to-lime-700",
    "from-slate-900 via-blue-900 to-cyan-700",
  ];
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

export interface JobCardProps {
  id: string;
  address: string;
  status: string;
  photoCount: number;
  createdAt: Date;
  coverUrl: string | null;
  size?: "md" | "lg" | "wide";
  photographerName?: string | null;
}

function formatRelative(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
}

export function JobCard({
  id,
  address,
  status,
  photoCount,
  createdAt,
  coverUrl,
  size = "md",
  photographerName,
}: JobCardProps) {
  const badge = statusStyles[status] ?? statusStyles.pending;
  const heightClass =
    size === "lg" ? "min-h-[300px] sm:min-h-[360px]" : size === "wide" ? "min-h-[220px]" : "min-h-[220px]";

  return (
    <Link
      href={`/job/${id}`}
      className={`group relative overflow-hidden rounded-3xl bg-graphite-900 border border-graphite-800 hover:border-graphite-600 transition-all flex flex-col ${heightClass}`}
    >
      {/* Cover */}
      <div className="absolute inset-0">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradientForId(id)}`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-graphite-950 via-graphite-950/40 to-transparent" />
      </div>

      {/* Top row — status */}
      <div className="relative flex items-start justify-between p-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-graphite-950/80 backdrop-blur border border-white/10 text-[11px] font-medium">
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
          <span className={badge.text}>{badge.label}</span>
        </span>
        <span className="text-[11px] font-medium text-white/70 tabular-nums">
          {photoCount} {photoCount === 1 ? "photo" : "photos"}
        </span>
      </div>

      {/* Bottom — address + meta */}
      <div className="relative mt-auto p-4 sm:p-5">
        <h3
          className={`font-semibold text-white tracking-tight leading-tight ${
            size === "lg" ? "text-2xl sm:text-3xl" : "text-lg"
          }`}
        >
          {address}
        </h3>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/60">
          <span>{formatRelative(createdAt)}</span>
          {photographerName && (
            <>
              <span>·</span>
              <span className="truncate">{photographerName}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
