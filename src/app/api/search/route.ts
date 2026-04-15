import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export interface SearchResult {
  type: "job" | "client" | "photo";
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ results: [], jobs: [], clients: [], photos: [] });
  }

  const [jobs, clients, photos] = await Promise.all([
    prisma.job
      .findMany({
        where: {
          photographerId: auth.userId,
          OR: [
            { address: { contains: q, mode: "insensitive" } },
            { clientName: { contains: q, mode: "insensitive" } },
            { tags: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          address: true,
          clientName: true,
          status: true,
          totalPhotos: true,
          tags: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
      .catch(() => []),
    prisma.client
      .findMany({
        where: {
          ownerId: auth.userId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, email: true, company: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
      .catch(() => []),
    prisma.photo
      .findMany({
        where: {
          caption: { contains: q, mode: "insensitive" },
          job: { photographerId: auth.userId },
        },
        select: {
          id: true,
          jobId: true,
          caption: true,
          status: true,
          job: { select: { address: true } },
        },
        orderBy: { id: "desc" },
        take: 5,
      })
      .catch(() => [] as Array<{
        id: string;
        jobId: string;
        caption: string | null;
        status: string;
        job: { address: string } | null;
      }>),
  ]);

  const jobResults: SearchResult[] = jobs.map((j) => ({
    type: "job",
    id: j.id,
    label: j.address,
    sublabel: [
      j.clientName,
      `${j.totalPhotos} photos`,
      j.status,
    ]
      .filter(Boolean)
      .join(" · "),
    href: `/review/${j.id}`,
  }));

  const clientResults: SearchResult[] = clients.map((c) => ({
    type: "client",
    id: c.id,
    label: c.name,
    sublabel: [c.company, c.email].filter(Boolean).join(" · ") || "Client",
    href: `/clients/${c.id}`,
  }));

  const photoResults: SearchResult[] = photos.map((p) => ({
    type: "photo",
    id: p.id,
    label: p.caption || "Untitled photo",
    sublabel: [p.job?.address, p.status].filter(Boolean).join(" · "),
    href: `/review/${p.jobId}?photo=${p.id}`,
  }));

  return NextResponse.json({
    results: [...jobResults, ...clientResults, ...photoResults],
    jobs: jobResults,
    clients: clientResults,
    photos: photoResults,
  });
}
