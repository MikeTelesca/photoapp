"use client";
import { useJobProgress } from "@/hooks/use-job-progress";

export function LiveProgressIndicator() {
  const { jobs, connected } = useJobProgress();
  const processing = jobs.filter(j => j.status === "processing");

  if (processing.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-lg shadow-lg p-3 max-w-xs">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-graphite-400"}`} />
        <div className="text-xs font-semibold dark:text-white">
          {processing.length} job{processing.length === 1 ? "" : "s"} processing
        </div>
      </div>
      <div className="space-y-1.5">
        {processing.slice(0, 3).map(j => (
          <div key={j.id} className="text-[11px]">
            <div className="flex justify-between mb-0.5">
              <span className="truncate dark:text-graphite-300 max-w-[160px]">{j.address}</span>
              <span className="text-amber-600 font-semibold">{j.processedPhotos}/{j.totalPhotos}</span>
            </div>
            <div className="h-1 bg-graphite-100 dark:bg-graphite-800 rounded">
              <div className="h-1 bg-amber-500 rounded transition-all"
                style={{ width: `${j.totalPhotos > 0 ? (j.processedPhotos / j.totalPhotos) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
        {processing.length > 3 && (
          <div className="text-[10px] text-graphite-400">+{processing.length - 3} more</div>
        )}
      </div>
    </div>
  );
}
