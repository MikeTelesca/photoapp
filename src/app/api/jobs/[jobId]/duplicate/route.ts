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
  const job = access.job;
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const newAddress = (body.address as string) || `${job.address} (Copy)`;

  const newJob = await prisma.job.create({
    data: {
      address: newAddress,
      photographerId: job.photographerId,
      preset: job.preset,
      tvStyle: job.tvStyle || "off",
      skyStyle: job.skyStyle || "as-is",
      watermarkText: job.watermarkText || null,
      clientName: job.clientName || null,
      tags: job.tags || "",
      status: "pending",
      // Don't copy: dropboxUrl, photos, cost, totalPhotos
    },
  });

  return NextResponse.json({ id: newJob.id });
}
