import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;

    const userId = authResult.userId;
    const body = await req.json();
    const { jobIds, clientId } = body as { jobIds: string[]; clientId: string | null };

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json({ error: "jobIds required" }, { status: 400 });
    }

    let clientName: string | null = null;

    if (clientId !== null && clientId !== undefined) {
      // Verify the client belongs to this user
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, name: true, ownerId: true },
      });
      if (!client || client.ownerId !== userId) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 }) ;
      }
      clientName = client.name;
    }

    // Only update jobs owned by the current user (ownership check)
    const res = await prisma.job.updateMany({
      where: { id: { in: jobIds }, photographerId: userId },
      data: {
        clientId: clientId ?? null,
        clientName: clientName,
      },
    });

    // Log activity for each affected job (best-effort)
    for (const jobId of jobIds) {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { address: true, photographerId: true },
      });
      if (job && job.photographerId === userId) {
        await logActivity({
          type: "job_updated",
          message: clientName
            ? `Assigned client "${clientName}" to ${job.address}`
            : `Cleared client from ${job.address}`,
          jobId,
          userId,
        });
      }
    }

    return NextResponse.json({ count: res.count, clientName });
  } catch (error) {
    console.error("Failed to bulk assign client:", error);
    return NextResponse.json(
      { error: "Failed to bulk assign client" },
      { status: 500 }
    );
  }
}
