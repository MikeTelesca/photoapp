import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

const FALLBACK_DEMO_URL =
  "https://www.dropbox.com/scl/fo/ybwdaliphgfks4rjub7qv/ANLkb3MU4lh3T2LJ3YpyobU?rlkey=dmht8wvonvb8b3ztg1gd7xb5e&st=25sgs80j&dl=0";

export async function POST() {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;

    const demoUrl = process.env.DEMO_DROPBOX_URL || FALLBACK_DEMO_URL;

    const job = await prisma.job.create({
      data: {
        address: "Demo Property — 123 Sample Lane",
        photographerId: authResult.userId,
        preset: "standard",
        tvStyle: "off",
        skyStyle: "as-is",
        dropboxUrl: demoUrl,
        status: "pending",
        clientName: "Demo Client",
        tags: "demo, sample",
      },
      include: {
        photographer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await logActivity({
      type: "job_created",
      message: `Created demo job for onboarding`,
      jobId: job.id,
      userId: authResult.userId,
    });

    return NextResponse.json({ id: job.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create demo job:", error);
    return NextResponse.json(
      { error: "Failed to create demo job" },
      { status: 500 }
    );
  }
}
