import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const q = request.nextUrl.searchParams.get("q") || "";
  if (q.length < 1) {
    return NextResponse.json({ jobs: [], clients: [] });
  }

  const [jobs, clients] = await Promise.all([
    prisma.job.findMany({
      where: {
        photographerId: auth.userId,
        OR: [
          { address: { contains: q, mode: "insensitive" } },
          { clientName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, address: true, clientName: true, status: true, totalPhotos: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }).catch(() => []),
    prisma.client.findMany({
      where: {
        ownerId: auth.userId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, company: true },
      take: 5,
    }).catch(() => []),
  ]);

  return NextResponse.json({ jobs, clients });
}
