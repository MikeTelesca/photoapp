import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/jobs - list all jobs
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where = status ? { status } : {};

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
}

// POST /api/jobs - create a new job
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { address, dropboxUrl, preset, photographerId } = body;

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  // Default to first admin user if no photographer specified
  let userId = photographerId;
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
}
