import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DownloadsAdminPage() {
  const auth = await requireAdmin();
  if ("error" in auth) redirect("/");

  const downloads = await prisma.downloadLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  }).catch(() => []);

  // Resolve user names
  const userIds = [...new Set(downloads.map(d => d.userId).filter(Boolean) as string[])];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  const jobIds = [...new Set(downloads.map(d => d.jobId).filter(Boolean) as string[])];
  const jobs = await prisma.job.findMany({
    where: { id: { in: jobIds } },
    select: { id: true, address: true },
  });
  const jobMap = new Map(jobs.map(j => [j.id, j]));

  const typeIcons: Record<string, string> = {
    zip: "📦",
    mls: "🏠",
    single: "📷",
    invoice: "💰",
    "pdf-gallery": "📄",
  };

  return (
    <>
      <Topbar title="Download log" />
      <div className="p-6">
        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-3 dark:text-white">Recent downloads ({downloads.length})</h2>
            {downloads.length === 0 ? (
              <div className="text-center py-8 text-sm text-graphite-400">No downloads tracked yet</div>
            ) : (
              <div className="space-y-1">
                {downloads.map(d => {
                  const user = d.userId ? userMap.get(d.userId) : null;
                  const job = d.jobId ? jobMap.get(d.jobId) : null;
                  return (
                    <div key={d.id} className="flex items-start gap-3 py-2 px-3 text-xs rounded hover:bg-graphite-50 dark:hover:bg-graphite-800 border-b border-graphite-50 dark:border-graphite-800">
                      <span className="text-base">{typeIcons[d.type] || "📥"}</span>
                      <div className="w-32 text-graphite-400 flex-shrink-0">{new Date(d.createdAt).toLocaleString()}</div>
                      <div className="w-32 truncate text-graphite-600 dark:text-graphite-300">{user?.name || user?.email || "—"}</div>
                      <div className="flex-1 truncate dark:text-white">
                        <span className="font-semibold uppercase tracking-wide">{d.type}</span>
                        {d.preset && <span className="ml-2 text-graphite-500">({d.preset})</span>}
                        {d.count && <span className="ml-2 text-graphite-500">{d.count} photo{d.count === 1 ? "" : "s"}</span>}
                        {job && <span className="ml-2 text-cyan">· {job.address}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
