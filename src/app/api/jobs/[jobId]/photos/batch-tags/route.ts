import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is string => typeof t === "string");
    }
    return [];
  } catch {
    return [];
  }
}

function normalizeTagList(input: string[] | undefined): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of input) {
    if (typeof t !== "string") continue;
    const trimmed = t.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const body = await request.json();
  const {
    photoIds,
    addTags,
    removeTags,
  }: {
    photoIds?: string[];
    addTags?: string[];
    removeTags?: string[];
  } = body ?? {};

  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: "No photoIds" }, { status: 400 });
  }

  const toAdd = normalizeTagList(addTags);
  const toRemove = normalizeTagList(removeTags);

  if (toAdd.length === 0 && toRemove.length === 0) {
    return NextResponse.json({ error: "No tags to add or remove" }, { status: 400 });
  }

  const removeSet = new Set(toRemove.map((t) => t.toLowerCase()));

  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds }, jobId },
    select: { id: true, autoTags: true },
  });

  let count = 0;

  for (const p of photos) {
    const existing = parseTags(p.autoTags);

    // Remove first (case-insensitive)
    const afterRemove = existing.filter(
      (t) => !removeSet.has(t.toLowerCase())
    );

    // Add, preserving existing casing, avoid duplicates (case-insensitive)
    const lowerSet = new Set(afterRemove.map((t) => t.toLowerCase()));
    const finalTags = [...afterRemove];
    for (const t of toAdd) {
      const key = t.toLowerCase();
      if (!lowerSet.has(key)) {
        finalTags.push(t);
        lowerSet.add(key);
      }
    }

    const nextJson =
      finalTags.length > 0 ? JSON.stringify(finalTags) : null;

    // Only write if changed
    if (nextJson !== (p.autoTags ?? null)) {
      await prisma.photo.update({
        where: { id: p.id },
        data: { autoTags: nextJson },
      });
      count++;
    }
  }

  return NextResponse.json({ count });
}
