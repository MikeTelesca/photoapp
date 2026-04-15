import { Suspense } from "react";
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
      photos: {
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
        include: { ratings: { orderBy: { createdAt: "asc" } } },
      },
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
    shareViewCount: job.shareViewCount,
    shareLastViewedAt: job.shareLastViewedAt?.toISOString() ?? null,
    sharePasswordSet: !!(job.sharePasswordHash || job.sharePassword),
    photos: job.photos.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      ratings: p.ratings.map((r) => ({
        id: r.id,
        authorName: r.authorName,
        rating: r.rating,
        createdAt: r.createdAt.toISOString(),
      })),
    })),
  };

  return (
    <Suspense fallback={<div className="w-full h-screen flex items-center justify-center">Loading gallery...</div>}>
      <ReviewGallery job={serializedJob} />
    </Suspense>
  );
}
