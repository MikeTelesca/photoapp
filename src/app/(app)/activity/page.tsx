import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { ActivityFilter } from "@/components/activity/activity-filter";
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
              <ActivityFilter logs={JSON.parse(JSON.stringify(logs))} />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

