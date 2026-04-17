import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { JobView } from "@/components/jobs/job-view";

// Strip base64 data URLs (multi-MB) from the server → client payload. Short
// http URLs pass through untouched so the client can embed them directly.
function shortUrl(v: string | null): string | null {
  if (!v) return null;
  if (v.startsWith("data:")) return null;
  return v;
}

// Derive how many source exposures fed this bracket group. `bracketIndex`
// was the file count in the original ingest writer; fall back to exifData.
function bracketCountFrom(bracketIndex: number | null, exifData: string | null): number {
  if (typeof bracketIndex === "number" && bracketIndex > 0) return bracketIndex;
  if (!exifData) return 1;
  try {
    const parsed: unknown = JSON.parse(exifData);
    if (
      parsed &&
      typeof parsed === "object" &&
      "photos" in parsed &&
      Array.isArray((parsed as { photos: unknown[] }).photos)
    ) {
      return (parsed as { photos: unknown[] }).photos.length || 1;
    }
  } catch {
    /* ignore */
  }
  return 1;
}

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
          bracketIndex: true,
          exifData: true,
          preset: true,
          tvStyle: true,
          skyStyle: true,
          seasonalStyle: true,
          customInstructions: true,
        },
      },
      agent: { select: { name: true } },
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
        agentId: job.agentId ?? null,
        agentName: job.agent?.name ?? null,
      }}
      initialPhotos={job.photos.map((p) => ({
        id: p.id,
        orderIndex: p.orderIndex,
        status: p.status,
        originalUrl: shortUrl(p.originalUrl),
        editedUrl: shortUrl(p.editedUrl),
        thumbnailUrl: shortUrl(p.thumbnailUrl),
        hasOriginal: !!p.originalUrl,
        hasEdited: !!p.editedUrl,
        hasThumbnail: !!p.thumbnailUrl,
        errorMessage: p.errorMessage,
        bracketCount: bracketCountFrom(p.bracketIndex, p.exifData),
        preset: p.preset,
        tvStyle: p.tvStyle,
        skyStyle: p.skyStyle,
        seasonalStyle: p.seasonalStyle,
        customInstructions: p.customInstructions,
      }))}
    />
  );
}
