import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const auth = await requireUser();
  if ("error" in auth) redirect("/signin");

  // Admins see all, users see their own
  const where = auth.role === "admin" ? {} : { userId: auth.userId };

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <Topbar title="Activity Log" subtitle="Audit trail of all actions" />
      <div className="p-6">
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-graphite-900 dark:text-white">
                Recent activity ({logs.length})
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-graphite-400 dark:text-graphite-500">Last 200 events</span>
                <a
                  href="/api/activity/export"
                  download
                  className="text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 hover:bg-graphite-50 dark:hover:bg-graphite-800 dark:text-graphite-300 transition-colors"
                >
                  Export CSV
                </a>
              </div>
            </div>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-sm text-graphite-400 dark:text-graphite-500">
                No activity yet
              </div>
            ) : (
              <div className="space-y-0">
                {logs.map((log, idx) => (
                  <div
                    key={log.id}
                    className={`flex flex-col gap-1 py-3 px-4 text-xs rounded hover:bg-graphite-50 dark:hover:bg-graphite-800 transition-colors ${
                      idx !== logs.length - 1
                        ? "border-b border-graphite-100 dark:border-graphite-800"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-graphite-400 dark:text-graphite-500 font-mono">
                        {formatTime(log.createdAt)}
                      </div>
                      <div className="flex-1 font-semibold text-graphite-800 dark:text-graphite-100">
                        {log.type}
                      </div>
                      <div className="text-graphite-500 dark:text-graphite-400 text-[11px]">
                        {log.userId ? `User: ${log.userId.slice(0, 8)}` : "System"}
                      </div>
                    </div>
                    {log.message && (
                      <div className="text-graphite-600 dark:text-graphite-300 text-[11px]">
                        {log.message}
                      </div>
                    )}
                    {log.metadata && (
                      <div className="text-graphite-500 dark:text-graphite-400 font-mono text-[10px] bg-graphite-50 dark:bg-graphite-900 p-2 rounded border border-graphite-100 dark:border-graphite-800 overflow-x-auto">
                        {typeof log.metadata === "string"
                          ? log.metadata
                          : JSON.stringify(log.metadata, null, 2)}
                      </div>
                    )}
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
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
