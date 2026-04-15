import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { checkRate } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

const PROMPT =
  "Write a concise 1-sentence MLS-style caption for this real estate photo. Focus on the room/feature shown. Do not include metaphors.";

async function captionOne(photoId: string, url: string, apiKey: string): Promise<string | null> {
  let imageData: string;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    imageData = buf.toString("base64");
  } catch {
    return null;
  }

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                { inlineData: { mimeType: "image/jpeg", data: imageData } },
              ],
            },
          ],
        }),
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    if (!text) return null;
    await prisma.photo.update({ where: { id: photoId }, data: { caption: text } });
    return text;
  } catch {
    return null;
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const rateErr = checkRate(access.userId, "ai-lite");
  if (rateErr) return rateErr;

  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const photos = await prisma.photo.findMany({
    where: { jobId, caption: null },
    select: { id: true, editedUrl: true, originalUrl: true },
    take: 50,
  });

  let success = 0;
  let failed = 0;
  for (const p of photos) {
    const url = p.editedUrl || p.originalUrl;
    if (!url) {
      failed++;
      continue;
    }
    const result = await captionOne(p.id, url, apiKey);
    if (result) success++;
    else failed++;
  }

  return NextResponse.json({ requested: photos.length, success, failed });
}
