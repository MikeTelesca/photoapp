import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

// GET /api/jobs - list all jobs
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId, role } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");

    const roleFilter = role === "admin" ? {} : { photographerId: userId };
    const where = status ? { ...roleFilter, status } : roleFilter;

    const jobs = await prisma.job.findMany({
      where,
      include: {
        photographer: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs", jobs: [] },
      { status: 500 }
    );
  }
}

// POST /api/jobs - create a new job
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId: sessionUserId, role: sessionUserRole } = authResult;

    const body = await request.json();
    const { address, dropboxUrl, preset, photographerId, tvStyle, skyStyle, watermarkText, clientName, tags } = body;

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    // Photographers always get their own ID; admins can specify or fall back to themselves
    let userId: string;
    if (sessionUserRole === "admin") {
      userId = photographerId || sessionUserId;
    } else {
      userId = sessionUserId;
    }

    const job = await prisma.job.create({
      data: {
        address,
        dropboxUrl: dropboxUrl || null,
        preset: preset || "standard",
        tvStyle: tvStyle || "netflix",
        skyStyle: skyStyle || "blue-clouds",
        watermarkText: watermarkText?.trim() || null,
        clientName: clientName?.trim() || null,
        tags: tags?.trim() || "",
        status: dropboxUrl ? "pending" : "pending",
        photographerId: userId,
      },
      include: {
        photographer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Failed to create job:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}
