import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string }> }
) {
  const { jobId, photoId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  try {
    // Reset photo to pending with retryCount = 0 for manual retry
    await prisma.photo.update({
      where: { id: photoId },
      data: { status: "pending", retryCount: 0 },
    });

    // Trigger enhance for this photo via the existing single-photo endpoint
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/jobs/${jobId}/photos/${photoId}/enhance`, {
      method: "POST",
      headers: { cookie: _req.headers.get("cookie") || "" },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retry photo" },
      { status: 500 }
    );
  }
}
