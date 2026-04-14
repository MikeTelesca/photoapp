import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/jobs - list all jobs
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");

    const roleFilter = userRole === "admin" ? {} : { photographerId: userId };
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
    const session = await auth();
    const sessionUserId = (session?.user as any)?.id;
    const sessionUserRole = (session?.user as any)?.role;

    const body = await request.json();
    const { address, dropboxUrl, preset, photographerId } = body;

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    // Photographers always get their own ID; admins can specify or fall back to themselves
    let userId: string | undefined;
    if (sessionUserRole === "admin") {
      userId = photographerId || sessionUserId;
    } else {
      userId = sessionUserId;
    }

    if (!userId) {
      const admin = await prisma.user.findFirst({ where: { role: "admin" } });
      if (!admin) {
        return NextResponse.json({ error: "No users found" }, { status: 400 });
      }
      userId = admin.id;
    }

    const job = await prisma.job.create({
      data: {
        address,
        dropboxUrl: dropboxUrl || null,
        preset: preset || "standard",
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
