import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { AddClientModal } from "@/components/clients/add-client-modal";
import { ImportClientsButton } from "@/components/clients/import-button";
import { ClientsListWithSelect } from "@/components/clients/clients-list-with-select";

export const dynamic = "force-dynamic";

const SPARK_DAYS = 30;

function emptySeries() {
  return Array<number>(SPARK_DAYS).fill(0);
}

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  let clients: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    _count: { jobs: number };
    sparkline?: number[];
  }> = [];

  try {
    const where = session.user.role === "admin" ? {} : { ownerId: session.user.id };
    clients = await (prisma as any).client.findMany({
      where,
      include: { _count: { select: { jobs: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // Table may not exist in prod yet — show empty state
  }

  // Build a 30-day photo sparkline per client via a single aggregate query.
  if (clients.length > 0) {
    const now = new Date();
    // Zero out to midnight UTC for stable bucket boundaries.
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const since = new Date(today);
    since.setUTCDate(since.getUTCDate() - (SPARK_DAYS - 1));

    const clientIds = clients.map(c => c.id);

    try {
      // Group jobs by client + created-at day, summing totalPhotos.
      // Using Prisma's groupBy on date requires truncation, so use $queryRaw.
      const rows = await (prisma as any).$queryRaw<
        Array<{ clientId: string; day: Date; photos: bigint | number }>
      >`
        SELECT "clientId",
               date_trunc('day', "createdAt") AS day,
               SUM("totalPhotos")::bigint AS photos
        FROM "Job"
        WHERE "clientId" = ANY(${clientIds}::text[])
          AND "createdAt" >= ${since}
        GROUP BY "clientId", date_trunc('day', "createdAt")
      `;

      const byClient = new Map<string, number[]>();
      for (const c of clients) byClient.set(c.id, emptySeries());

      for (const r of rows) {
        if (!r.clientId) continue;
        const series = byClient.get(r.clientId);
        if (!series) continue;
        const day = new Date(r.day);
        const dayUtc = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
        const sinceUtc = since.getTime();
        const idx = Math.floor((dayUtc - sinceUtc) / (1000 * 60 * 60 * 24));
        if (idx >= 0 && idx < SPARK_DAYS) {
          series[idx] += Number(r.photos) || 0;
        }
      }

      clients = clients.map(c => ({ ...c, sparkline: byClient.get(c.id) ?? emptySeries() }));
    } catch {
      // If the aggregate fails (e.g. missing table), fall back to empty sparklines.
      clients = clients.map(c => ({ ...c, sparkline: emptySeries() }));
    }
  }

  return (
    <>
      <Topbar title="Clients" subtitle="Manage your realtor and client contacts" />
      <div className="p-6 max-w-3xl">
        <div className="flex items-center justify-between gap-2 mb-5">
          <div className="flex items-center gap-2">
            {clients.length > 0 && (
              <a
                href="/api/clients/export"
                download
                className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 hover:bg-graphite-50 dark:hover:bg-graphite-800 dark:text-graphite-300 transition-colors"
              >
                Export CSV
              </a>
            )}
            <ImportClientsButton />
          </div>
          <AddClientModal />
        </div>
        {clients.length === 0 ? (
          <Card>
            <div className="p-12 text-center">
              <UserGroupIcon className="w-10 h-10 text-graphite-300 dark:text-graphite-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-graphite-600 dark:text-graphite-300 mb-1">No clients yet</p>
              <p className="text-xs text-graphite-400 dark:text-graphite-500">
                Add your first client using the button above, or pick a client when creating a new job.
              </p>
            </div>
          </Card>
        ) : (
          <Card>
            <ClientsListWithSelect clients={clients} />
          </Card>
        )}
      </div>
    </>
  );
}
