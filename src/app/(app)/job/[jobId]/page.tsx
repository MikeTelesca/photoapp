import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
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
      // Select only scalar columns — NOT originalUrl/editedUrl/thumbnailUrl,
      // which are base64 data URLs multiple MB each. Client loads those on
      // demand through /api/jobs/:id/photos/:id/thumb.
      photos: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          orderIndex: true,
          status: true,
          originalUrl: true,
          editedUrl: true,
          thumbnailUrl: true,
          errorMessage: true,
        },
      },
    },
  });

  if (!job) notFound();
  if (!isAdmin && job.photographerId !== session.user.id) notFound();

  return (
    <JobView
      initialJob={{
        id: job.id,
        address: job.address,
        status: job.status,
        dropboxUrl: job.dropboxUrl,
        preset: job.preset,
        tvStyle: job.tvStyle,
        skyStyle: job.skyStyle,
        seasonalStyle: job.seasonalStyle,
      }}
      initialPhotos={job.photos.map((p) => ({
        id: p.id,
        orderIndex: p.orderIndex,
        status: p.status,
        hasOriginal: !!p.originalUrl,
        hasEdited: !!p.editedUrl,
        hasThumbnail: !!p.thumbnailUrl,
        errorMessage: p.errorMessage,
      }))}
    />
  );
}
