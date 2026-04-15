import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;

  const { userId, role } = authResult;
  const { id: keepId } = await params;
  const { mergeFromId } = await request.json();

  if (!mergeFromId || mergeFromId === keepId) {
    return NextResponse.json({ error: "mergeFromId required and must differ from keepId" }, { status: 400 });
  }

  try {
    // Verify both clients belong to user
    const keep = await prisma.client.findFirst({
      where: { id: keepId, ...(role !== "admin" && { ownerId: userId }) },
    });
    const mergeFrom = await prisma.client.findFirst({
      where: { id: mergeFromId, ...(role !== "admin" && { ownerId: userId }) },
    });

    if (!keep || !mergeFrom) {
      return NextResponse.json({ error: "Client not found or not yours" }, { status: 404 });
    }

    // Move all jobs from mergeFrom → keep
    const jobsUpdated = await prisma.job.updateMany({
      where: { clientId: mergeFromId },
      data: { clientId: keepId, clientName: keep.name },
    });

    // Delete the mergeFrom client
    await prisma.client.delete({ where: { id: mergeFromId } });

    return NextResponse.json({ ok: true, jobsMoved: jobsUpdated.count });
  } catch (error) {
    console.error("Failed to merge clients:", error);
    return NextResponse.json({ error: "Failed to merge clients" }, { status: 500 });
  }
}
