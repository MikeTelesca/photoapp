import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ReviewGallery } from "@/components/review/review-gallery";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      photographer: { select: { name: true } },
      photos: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!job) notFound();

  // Serialize dates for client component
  const serializedJob = {
    ...job,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    photographer: job.photographer,
    shareToken: job.shareToken ?? null,
    shareEnabled: job.shareEnabled,
    photos: job.photos.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  };

  return <ReviewGallery job={serializedJob} />;
}
