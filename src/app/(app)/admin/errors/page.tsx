import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ErrorsPage() {
  const auth = await requireAdmin();
  if ("error" in auth) redirect("/");

  const errors = await prisma.errorLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  }).catch(() => []);

  return (
    <>
      <Topbar title="Error Log" />
      <div className="p-6">
        <Card>
          <div className="p-4">
            <div className="flex justify-between mb-3">
              <h2 className="text-sm font-semibold dark:text-white">Recent errors ({errors.length})</h2>
              <span className="text-xs text-graphite-400">Last 200 entries</span>
            </div>
            {errors.length === 0 ? (
              <div className="text-center py-8 text-sm text-graphite-400">No errors logged</div>
            ) : (
              <div className="space-y-1">
                {errors.map(err => (
                  <div key={err.id} className="py-2 px-3 text-xs border-b border-graphite-50 dark:border-graphite-800 last:border-b-0">
                    <div className="flex items-start gap-3">
                      <span className="w-28 text-graphite-400 dark:text-graphite-500 flex-shrink-0">{formatTime(err.createdAt)}</span>
                      <span className="w-24 flex-shrink-0">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300">{err.source}</span>
                      </span>
                      <span className="flex-1">
                        <div className="text-graphite-800 dark:text-graphite-100 font-medium break-words">{err.message}</div>
                        {err.metadata && (
                          <div className="text-[10px] text-graphite-500 dark:text-graphite-400 font-mono truncate mt-0.5">{err.metadata}</div>
                        )}
                        {(err.jobId || err.photoId) && (
                          <div className="text-[10px] text-graphite-400 mt-0.5">
                            {err.jobId && `Job: ${err.jobId.slice(0, 8)}... `}
                            {err.photoId && `Photo: ${err.photoId.slice(0, 8)}...`}
                          </div>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
