import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

// GET /api/jobs/:jobId - get a single job with its photos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const access = await requireJobAccess(jobId);
    if ("error" in access) return access.error;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        photographer: {
          select: { id: true, name: true, email: true },
        },
        photos: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Failed to fetch job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}

// PATCH /api/jobs/:jobId - update a job
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const access = await requireJobAccess(jobId);
    if ("error" in access) return access.error;
    const { role, job: existingJob } = access;

    const body = await request.json();

    // Mass assignment defense: whitelist allowed fields
    const allowed: Record<string, any> = {};
    const allowedFields = ["address", "preset", "tvStyle", "skyStyle", "notes", "watermarkText"] as const;
    for (const field of allowedFields) {
      if (body[field] !== undefined) allowed[field] = body[field];
    }

    // Status field has additional role checks
    if (body.status !== undefined) {
      if (role === "admin") {
        allowed.status = body.status;
      } else {
        // Photographers can only cancel their own jobs
        if (body.status === "cancelled" || body.status === "deleted") {
          allowed.status = body.status;
        } else {
          return NextResponse.json(
            { error: "Forbidden: cannot change status" },
            { status: 403 }
          );
        }
      }
    }

    const job = await prisma.job.update({
      where: { id: jobId },
      data: allowed,
      include: {
        photographer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error("Failed to update job:", error);
    return NextResponse.json(
      { error: "Failed to update job" },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/:jobId - delete a job and its photos
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const access = await requireJobAccess(jobId);
    if ("error" in access) return access.error;

    // Soft delete - preserve cost data
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "deleted" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete job:", error);
    return NextResponse.json(
      { error: "Failed to delete job" },
      { status: 500 }
    );
  }
}
