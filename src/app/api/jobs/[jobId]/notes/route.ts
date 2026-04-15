import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  let body: { notes?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.notes !== "string") {
    return NextResponse.json({ error: "notes (string) required" }, { status: 400 });
  }

  const trimmed = body.notes.slice(0, 5000);

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: { internalNotes: trimmed.length === 0 ? null : trimmed },
    select: { id: true, internalNotes: true },
  });

  return NextResponse.json(updated);
}
