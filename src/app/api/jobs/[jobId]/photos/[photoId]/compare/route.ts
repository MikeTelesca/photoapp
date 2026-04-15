import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { checkRate } from "@/lib/rate-limit";
import { enhancePhoto } from "@/lib/ai-enhance";

export const maxDuration = 120;
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string }> }
) {
  const { jobId, photoId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const rateErr = checkRate(access.userId, "enhance");
  if (rateErr) return rateErr;

  const { preset } = await request.json();
  if (!preset) return NextResponse.json({ error: "preset required" }, { status: 400 });

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const origUrl = photo.originalUrl;
  if (!origUrl) return NextResponse.json({ error: "No original" }, { status: 400 });

  try {
    const res = await fetch(origUrl);
    if (!res.ok) throw new Error("Failed to fetch original image");
    const buf = Buffer.from(await res.arrayBuffer());

    // Look up the preset prompt modifiers
    const presetRow = await prisma.preset.findFirst({
      where: { slug: preset },
    });
    // promptModifiers is used as customInstructions; pass null if empty
    const customInstructions = presetRow?.promptModifiers?.trim() || null;

    // Call enhance with the alternative preset
    const result = await enhancePhoto(buf, "image/jpeg", preset, customInstructions);

    if (!result.success || !result.imageBase64) {
      return NextResponse.json({ error: result.error || "Enhance failed" }, { status: 500 });
    }

    const mimeType = result.mimeType || "image/jpeg";
    return NextResponse.json({
      dataUrl: `data:${mimeType};base64,${result.imageBase64}`,
      preset,
    });
  } catch (err: any) {
    console.error("compare err:", err);
    return NextResponse.json({ error: err.message || "Compare failed" }, { status: 500 });
  }
}
