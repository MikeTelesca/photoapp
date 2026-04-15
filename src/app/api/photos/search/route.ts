import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ photos: [] });

  // Search photos via exifData (JSON string) and caption, tags, autoTags
  // Limit to user's jobs (non-archived)
  const photos = await prisma.photo.findMany({
    where: {
      job: { photographerId: auth.userId, archivedAt: null },
      OR: [
        { caption: { contains: q, mode: "insensitive" } },
        { autoTags: { contains: q, mode: "insensitive" } },
        { exifData: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      jobId: true,
      editedUrl: true,
      originalUrl: true,
      caption: true,
      autoTags: true,
      exifData: true,
      job: { select: { address: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  }).catch(() => []);

  return NextResponse.json({ photos });
}
