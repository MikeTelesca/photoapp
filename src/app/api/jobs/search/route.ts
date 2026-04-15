import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const sp = request.nextUrl.searchParams;
  const q = sp.get("q") || "";
  const from = sp.get("from");
  const to = sp.get("to");
  const minCost = sp.get("minCost");
  const maxCost = sp.get("maxCost");
  const minPhotos = sp.get("minPhotos");
  const status = sp.get("status");
  const preset = sp.get("preset");
  const clientId = sp.get("clientId");

  // Admins see all jobs; photographers see only their own
  const where: Record<string, unknown> =
    auth.role === "admin" ? {} : { photographerId: auth.userId };

  if (q) {
    where.OR = [
      { address: { contains: q, mode: "insensitive" } },
      { clientName: { contains: q, mode: "insensitive" } },
      { tags: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ];
  }
  if (from)
    where.createdAt = {
      ...((where.createdAt as Record<string, unknown>) || {}),
      gte: new Date(from),
    };
  if (to)
    where.createdAt = {
      ...((where.createdAt as Record<string, unknown>) || {}),
      lte: new Date(to),
    };
  if (minCost)
    where.cost = {
      ...((where.cost as Record<string, unknown>) || {}),
      gte: parseFloat(minCost),
    };
  if (maxCost)
    where.cost = {
      ...((where.cost as Record<string, unknown>) || {}),
      lte: parseFloat(maxCost),
    };
  if (minPhotos) where.totalPhotos = { gte: parseInt(minPhotos) };
  if (status) where.status = status;
  if (preset) where.preset = preset;
  if (clientId) where.clientId = clientId;

  const jobs = await prisma.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      address: true,
      clientName: true,
      preset: true,
      status: true,
      totalPhotos: true,
      approvedPhotos: true,
      cost: true,
      createdAt: true,
      tags: true,
      notes: true,
      photographer: { select: { id: true, name: true } },
    },
  }).catch(() => []);

  return NextResponse.json({ jobs, count: jobs.length });
}
