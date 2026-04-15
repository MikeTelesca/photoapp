import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserGroupIcon, EnvelopeIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { AddClientModal } from "@/components/clients/add-client-modal";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

  return (
    <>
      <Topbar title="Clients" subtitle="Manage your realtor and client contacts" />
      <div className="p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-5">
          {clients.length > 0 && (
            <a
              href="/api/clients/export"
              download
              className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 hover:bg-graphite-50 dark:hover:bg-graphite-800 dark:text-graphite-300 transition-colors"
            >
              Export CSV
            </a>
          )}
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
            <div className="divide-y divide-graphite-100 dark:divide-graphite-800">
              {clients.map((client) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-graphite-50 dark:hover:bg-graphite-800 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-graphite-900 dark:text-white group-hover:text-cyan transition-colors">
                        {client.name}
                      </span>
                      {client.company && (
                        <span className="text-xs text-graphite-400 dark:text-graphite-500">
                          · {client.company}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-0.5">
                      {client.email && (
                        <span className="flex items-center gap-1 text-xs text-graphite-400 dark:text-graphite-500">
                          <EnvelopeIcon className="w-3 h-3" />
                          {client.email}
                        </span>
                      )}
                      {client.phone && (
                        <span className="flex items-center gap-1 text-xs text-graphite-400 dark:text-graphite-500">
                          <PhoneIcon className="w-3 h-3" />
                          {client.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <span className="text-xs font-semibold text-graphite-500 dark:text-graphite-400">
                      {client._count.jobs} job{client._count.jobs === 1 ? "" : "s"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
