import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

type CacheEntry = {
  key: string; // `${jobId}:${updatedAtMs}`
  palette: string[];
  sampleCount: number;
};

// Module-scoped in-memory cache per-job, keyed by job.updatedAt
const cache = new Map<string, CacheEntry>();

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Simple 4x4x4 RGB bucketing to cluster near-duplicate averages
function bucketKey(r: number, g: number, b: number): string {
  const qr = Math.floor(r / 64);
  const qg = Math.floor(g / 64);
  const qb = Math.floor(b / 64);
  return `${qr}-${qg}-${qb}`;
}

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
      select: { id: true, updatedAt: true },
    });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const cacheKey = `${job.id}:${job.updatedAt.getTime()}`;
    const cached = cache.get(job.id);
    if (cached && cached.key === cacheKey) {
      return NextResponse.json({
        palette: cached.palette,
        sampleCount: cached.sampleCount,
        cached: true,
      });
    }

    const photos = await prisma.photo.findMany({
      where: {
        jobId,
        status: { in: ["edited", "approved"] },
        editedUrl: { not: null },
      },
      orderBy: { orderIndex: "asc" },
      select: { id: true, editedUrl: true },
    });

    if (photos.length === 0) {
      return NextResponse.json({ palette: [], sampleCount: 0 });
    }

    // Sample evenly: aim for 5-10 photos across the set
    const targetSamples = Math.min(10, Math.max(5, Math.ceil(photos.length / 3)));
    const step = Math.max(1, Math.floor(photos.length / targetSamples));
    const sampled: typeof photos = [];
    for (let i = 0; i < photos.length && sampled.length < targetSamples; i += step) {
      sampled.push(photos[i]);
    }

    // Compute average RGB per photo via sharp().stats()
    const buckets = new Map<
      string,
      { r: number; g: number; b: number; count: number }
    >();

    for (const p of sampled) {
      if (!p.editedUrl) continue;
      try {
        const res = await fetch(p.editedUrl);
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        const stats = await sharp(buf).stats();
        // channels: [R, G, B, (A?)]
        const [r, g, b] = stats.channels;
        if (!r || !g || !b) continue;
        const key = bucketKey(r.mean, g.mean, b.mean);
        const existing = buckets.get(key);
        if (existing) {
          existing.r += r.mean;
          existing.g += g.mean;
          existing.b += b.mean;
          existing.count += 1;
        } else {
          buckets.set(key, {
            r: r.mean,
            g: g.mean,
            b: b.mean,
            count: 1,
          });
        }
      } catch {
        // skip broken photos
      }
    }

    // Sort buckets by count desc, take up to 6, compute average per bucket
    const sorted = Array.from(buckets.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const palette = sorted.map((b) =>
      toHex(b.r / b.count, b.g / b.count, b.b / b.count)
    );

    cache.set(job.id, {
      key: cacheKey,
      palette,
      sampleCount: sampled.length,
    });

    return NextResponse.json({
      palette,
      sampleCount: sampled.length,
      cached: false,
    });
  } catch (error) {
    console.error("Failed to compute color palette:", error);
    return NextResponse.json(
      { error: "Failed to compute color palette" },
      { status: 500 }
    );
  }
}
