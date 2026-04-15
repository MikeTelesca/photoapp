import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { EnvelopeIcon, PhoneIcon, BuildingOfficeIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { ClientDetailActions } from "@/components/clients/client-detail-actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { id } = await params;

  let client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    notes: string | null;
    ownerId: string;
    createdAt: Date;
    jobs: Array<{
      id: string;
      address: string;
      status: string;
      totalPhotos: number;
      processedPhotos: number;
      cost: number;
      createdAt: Date;
    }>;
  } | null = null;

  try {
    const where =
      session.user.role === "admin"
        ? { id }
        : { id, ownerId: session.user.id };

    client = await (prisma as any).client.findFirst({
      where,
      include: {
        jobs: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            address: true,
            status: true,
            totalPhotos: true,
            processedPhotos: true,
            cost: true,
            createdAt: true,
          },
        },
      },
    });
  } catch {
    // Table may not exist yet
  }

  if (!client) notFound();

  const statusColors: Record<string, string> = {
    pending: "bg-graphite-100 text-graphite-600 dark:bg-graphite-700 dark:text-graphite-300",
    processing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    review: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <>
      <Topbar title={client.name} subtitle={client.company || "Client detail"} />
      <div className="p-6 max-w-3xl space-y-6">
        {/* Info card */}
        <Card>
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-base font-bold text-graphite-900 dark:text-white">{client.name}</h2>
              <ClientDetailActions client={client} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {client.email && (
                <div className="flex items-center gap-2 text-sm text-graphite-600 dark:text-graphite-300">
                  <EnvelopeIcon className="w-4 h-4 text-graphite-400 flex-shrink-0" />
                  <a href={`mailto:${client.email}`} className="hover:text-cyan transition-colors">
                    {client.email}
                  </a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-sm text-graphite-600 dark:text-graphite-300">
                  <PhoneIcon className="w-4 h-4 text-graphite-400 flex-shrink-0" />
                  <a href={`tel:${client.phone}`} className="hover:text-cyan transition-colors">
                    {client.phone}
                  </a>
                </div>
              )}
              {client.company && (
                <div className="flex items-center gap-2 text-sm text-graphite-600 dark:text-graphite-300">
                  <BuildingOfficeIcon className="w-4 h-4 text-graphite-400 flex-shrink-0" />
                  {client.company}
                </div>
              )}
              {client.notes && (
                <div className="flex items-start gap-2 text-sm text-graphite-600 dark:text-graphite-300 sm:col-span-2">
                  <DocumentTextIcon className="w-4 h-4 text-graphite-400 flex-shrink-0 mt-0.5" />
                  <span className="whitespace-pre-wrap">{client.notes}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Jobs list */}
        <div>
          <h3 className="text-sm font-bold text-graphite-700 dark:text-graphite-300 mb-3 uppercase tracking-wider">
            Jobs ({client.jobs.length})
          </h3>
          {client.jobs.length === 0 ? (
            <Card>
              <div className="p-8 text-center text-sm text-graphite-400 dark:text-graphite-500">
                No jobs for this client yet.{" "}
                <Link href="/jobs/new" className="text-cyan hover:underline">
                  Create one
                </Link>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="divide-y divide-graphite-100 dark:divide-graphite-800">
                {client.jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-graphite-50 dark:hover:bg-graphite-800 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-graphite-900 dark:text-white group-hover:text-cyan transition-colors block truncate">
                        {job.address}
                      </span>
                      <span className="text-xs text-graphite-400 dark:text-graphite-500">
                        {job.totalPhotos} photos · ${job.cost.toFixed(2)} ·{" "}
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span
                      className={`ml-3 flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        statusColors[job.status] || statusColors.pending
                      }`}
                    >
                      {job.status}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
