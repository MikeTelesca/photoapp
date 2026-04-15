import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import crypto from "crypto";

export const runtime = "nodejs";

// POST /api/photos/:photoId/public-url
// Returns { url } for a public single-photo share link. Creates a shareToken
// for the job if one does not already exist (auto-enables sharing).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: {
      id: true,
      jobId: true,
      job: {
        select: {
          id: true,
          photographerId: true,
          shareToken: true,
          shareEnabled: true,
        },
      },
    },
  });

  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Job ownership check (non-admin)
  if (auth.role !== "admin" && photo.job.photographerId !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let token = photo.job.shareToken;
  if (!token) {
    token = crypto.randomBytes(16).toString("hex");
    await prisma.job.update({
      where: { id: photo.jobId },
      data: {
        shareToken: token,
        shareEnabled: true,
      },
    });
  } else if (!photo.job.shareEnabled) {
    // Re-enable sharing so the link actually works
    await prisma.job.update({
      where: { id: photo.jobId },
      data: { shareEnabled: true },
    });
  }

  // Derive origin from the incoming request so this works in dev/prod/preview
  const origin =
    request.headers.get("origin") ||
    (() => {
      try {
        return new URL(request.url).origin;
      } catch {
        return "";
      }
    })();

  const url = `${origin}/share/${token}/photo/${photoId}`;

  return NextResponse.json({ url, token });
}
