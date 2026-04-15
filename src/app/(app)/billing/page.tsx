import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { UsageCsvExport } from "@/components/billing/usage-csv-export";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const auth = await requireUser();
  if ("error" in auth) redirect("/signin");

  const jobs = await prisma.job.findMany({
    where: { photographerId: auth.userId },
    select: { createdAt: true, totalPhotos: true, cost: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  // Group by YYYY-MM
  const byMonth = new Map<string, { jobs: number; photos: number; cost: number }>();
  for (const j of jobs) {
    const key = j.createdAt.toISOString().slice(0, 7);
    const cur = byMonth.get(key) || { jobs: 0, photos: 0, cost: 0 };
    cur.jobs++;
    cur.photos += j.totalPhotos;
    cur.cost += j.cost;
    byMonth.set(key, cur);
  }

  const months = Array.from(byMonth.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12);

  const ytd = jobs
    .filter(j => j.createdAt.getFullYear() === new Date().getFullYear())
    .reduce(
      (acc, j) => ({ jobs: acc.jobs + 1, photos: acc.photos + j.totalPhotos, cost: acc.cost + j.cost }),
      { jobs: 0, photos: 0, cost: 0 }
    );

  // Current month projection
  const now = new Date();
  const curKey = now.toISOString().slice(0, 7);
  const cur = byMonth.get(curKey) || { jobs: 0, photos: 0, cost: 0 };
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const projected = dayOfMonth > 0 ? (cur.cost / dayOfMonth) * daysInMonth : 0;

  const outstanding = await prisma.job.findMany({
    where: {
      photographerId: auth.userId,
      invoiceSentAt: { not: null },
      invoicePaidAt: null,
      status: "approved",
      archivedAt: null,
    },
    orderBy: { invoiceSentAt: "asc" },
    take: 20,
  }).catch(() => []);

  const outstandingTotal = outstanding.reduce((s: number, j: any) => s + (j.cost || 0), 0);

  return (
    <>
      <Topbar title="Billing & Usage" subtitle="View your monthly costs and photo processing stats" />
      <div className="p-6 space-y-6">
        {outstanding.length > 0 && (
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold dark:text-white">⚠ Outstanding invoices</h2>
                  <p className="text-xs text-amber-600 dark:text-amber-400">${outstandingTotal.toFixed(2)} unpaid across {outstanding.length} job{outstanding.length === 1 ? "" : "s"}</p>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="text-xs text-graphite-400 border-b border-graphite-100 dark:border-graphite-800">
                  <tr>
                    <th className="text-left py-2">Address</th>
                    <th className="text-left">Client</th>
                    <th className="text-right">Sent</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {outstanding.map((j: any) => (
                    <tr key={j.id} className="border-b border-graphite-50 dark:border-graphite-800">
                      <td className="py-2 dark:text-white">{j.address}</td>
                      <td className="text-xs">{j.clientName || "—"}</td>
                      <td className="text-right text-xs">{new Date(j.invoiceSentAt).toLocaleDateString()}</td>
                      <td className="text-right font-semibold dark:text-white">${j.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-4">
              <div className="text-xs text-graphite-400 dark:text-graphite-500 mb-1">YTD Jobs</div>
              <div className="text-2xl font-bold text-graphite-900 dark:text-white">{ytd.jobs}</div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="text-xs text-graphite-400 dark:text-graphite-500 mb-1">YTD Photos</div>
              <div className="text-2xl font-bold text-graphite-900 dark:text-white">{ytd.photos}</div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="text-xs text-graphite-400 dark:text-graphite-500 mb-1">YTD Cost</div>
              <div className="text-2xl font-bold text-graphite-900 dark:text-white">${ytd.cost.toFixed(2)}</div>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <div className="text-xs text-graphite-400 dark:text-graphite-500 mb-1">This month (projected)</div>
              <div className="text-2xl font-bold text-cyan">${projected.toFixed(2)}</div>
              <div className="text-xs text-graphite-500 dark:text-graphite-400 mt-1">so far: ${cur.cost.toFixed(2)}</div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-graphite-900 dark:text-white">Export usage</h2>
              <p className="text-xs text-graphite-500 dark:text-graphite-400">Download a CSV of jobs updated in a given month.</p>
            </div>
            <UsageCsvExport />
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold text-graphite-900 dark:text-white mb-4">Monthly breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-graphite-400 dark:text-graphite-500 border-b border-graphite-100 dark:border-graphite-800">
                  <tr>
                    <th className="text-left py-3 px-2 font-medium">Month</th>
                    <th className="text-right py-3 px-2 font-medium">Jobs</th>
                    <th className="text-right py-3 px-2 font-medium">Photos</th>
                    <th className="text-right py-3 px-2 font-medium">Avg $/photo</th>
                    <th className="text-right py-3 px-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map(([month, data]) => (
                    <tr key={month} className="border-b border-graphite-50 dark:border-graphite-800 hover:bg-graphite-50 dark:hover:bg-graphite-800/50 transition-colors">
                      <td className="py-3 px-2 font-medium text-graphite-900 dark:text-white">{formatMonth(month)}</td>
                      <td className="text-right py-3 px-2 text-graphite-700 dark:text-graphite-300">{data.jobs}</td>
                      <td className="text-right py-3 px-2 text-graphite-700 dark:text-graphite-300">{data.photos}</td>
                      <td className="text-right py-3 px-2 text-graphite-700 dark:text-graphite-300">
                        ${data.photos > 0 ? (data.cost / data.photos).toFixed(3) : "0.00"}
                      </td>
                      <td className="text-right py-3 px-2 font-semibold text-graphite-900 dark:text-white">${data.cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {months.length === 0 && (
                <div className="text-center text-graphite-400 dark:text-graphite-500 py-8 text-sm">No billing data yet</div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function formatMonth(key: string) {
  const [y, m] = key.split("-");
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
