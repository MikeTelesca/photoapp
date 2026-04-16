import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { JobView } from "@/components/jobs/job-view";

export const dynamic = "force-dynamic";

export default async function JobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { jobId } = await params;
  const isAdmin = session.user.role === "admin";

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      photos: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!job) notFound();
  if (!isAdmin && job.photographerId !== session.user.id) notFound();

  return (
    <main className="min-h-screen bg-graphite-50 dark:bg-graphite-950 text-graphite-900 dark:text-white">
      <header className="sticky top-0 z-10 border-b border-graphite-200 dark:border-graphite-800 bg-white/90 dark:bg-graphite-950/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/jobs" className="text-graphite-500 hover:text-graphite-900 dark:hover:text-white text-sm">
              ← Jobs
            </Link>
            <span className="text-graphite-300 dark:text-graphite-700">/</span>
            <span className="font-medium text-sm truncate max-w-[360px]">{job.address}</span>
          </div>
        </div>
      </header>

      <JobView
        initialJob={{
          id: job.id,
          address: job.address,
          status: job.status,
          dropboxUrl: job.dropboxUrl,
          preset: job.preset,
          totalPhotos: job.totalPhotos,
          processedPhotos: job.processedPhotos,
          approvedPhotos: job.approvedPhotos,
        }}
        initialPhotos={job.photos.map((p) => ({
          id: p.id,
          orderIndex: p.orderIndex,
          status: p.status,
          originalUrl: p.originalUrl,
          editedUrl: p.editedUrl,
          thumbnailUrl: p.thumbnailUrl,
          errorMessage: p.errorMessage,
        }))}
      />
    </main>
  );
}
