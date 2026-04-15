import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;
  const source = access.job;
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Increment job sequence counter and get updated values
  const updated = await prisma.user.update({
    where: { id: source.photographerId },
    data: { jobSequenceCounter: { increment: 1 } },
    select: { jobSequenceCounter: true },
  });

  // Clone all settings but no photos, no dropbox URL, cost reset
  const cloned = await prisma.job.create({
    data: {
      address: `${source.address} (copy)`,
      photographerId: source.photographerId,
      preset: source.preset,
      tvStyle: source.tvStyle || "netflix",
      skyStyle: source.skyStyle || "blue-clouds",
      seasonalStyle: source.seasonalStyle || null,
      watermarkText: source.watermarkText || null,
      watermarkPosition: source.watermarkPosition || "bottom-right",
      watermarkSize: source.watermarkSize || 32,
      watermarkOpacity: source.watermarkOpacity || 0.7,
      clientName: source.clientName || null,
      clientId: source.clientId || null,
      tags: source.tags || "",
      notes: source.notes || null,
      status: "pending",
      totalPhotos: 0,
      processedPhotos: 0,
      approvedPhotos: 0,
      rejectedPhotos: 0,
      twilightCount: 0,
      cost: 0,
      dropboxUrl: "", // user will provide new source
      sequenceNumber: updated.jobSequenceCounter,
    },
  });

  return NextResponse.json({ id: cloned.id });
}
