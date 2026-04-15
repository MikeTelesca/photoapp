import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

const TAG_MAP: Record<string, string> = {
  // Property type indicators
  "exterior": "exterior-shoot",
  "twilight": "twilight",
  "pool": "luxury",
  "view": "premium-view",
  // Style indicators - bias from common combinations
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const photos = await prisma.photo.findMany({
    where: { jobId, autoTags: { not: null } },
    select: { autoTags: true },
  }).catch(() => []);

  if (photos.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  // Tally tags
  const tagCounts = new Map<string, number>();
  for (const p of photos) {
    if (!p.autoTags) continue;
    try {
      const tags: string[] = JSON.parse(p.autoTags);
      if (Array.isArray(tags)) {
        for (const t of tags) {
          tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
        }
      }
    } catch {}
  }

  const totalPhotos = photos.length;
  const suggestions: string[] = [];

  // Suggest based on majority tags
  const tags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);
  for (const [tag, count] of tags) {
    const pct = count / totalPhotos;

    // Direct mapping
    if (TAG_MAP[tag] && pct > 0.1) {
      if (!suggestions.includes(TAG_MAP[tag])) suggestions.push(TAG_MAP[tag]);
    }

    // Property-type heuristics
    if (pct > 0.3 && tag === "exterior") suggestions.push("has-exterior");
    if (pct > 0.3 && tag === "twilight") suggestions.push("twilight-shoot");
    if (count >= 2 && tag === "pool") suggestions.push("pool-property");
    if (count >= 2 && tag === "view") suggestions.push("scenic-view");
  }

  // Photo count tier
  if (totalPhotos >= 50) suggestions.push("large-shoot");
  if (totalPhotos < 20) suggestions.push("quick-shoot");

  return NextResponse.json({
    suggestions: Array.from(new Set(suggestions)).slice(0, 5),
    totalPhotos,
    topTags: tags.slice(0, 5).map(([t, c]) => ({ tag: t, count: c })),
  });
}
