import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { checkRate } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const PROMPT =
  "Write a concise 1-sentence MLS-style caption for this real estate photo. Focus on the room/feature shown. Do not include metaphors.";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const rateErr = await checkRate(auth.userId, "ai-lite");
  if (rateErr) return rateErr;

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Job ownership check (404 not 403 to prevent ID enumeration)
  if (auth.role !== "admin") {
    const job = await prisma.job.findUnique({
      where: { id: photo.jobId },
      select: { photographerId: true },
    });
    if (!job || job.photographerId !== auth.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const url = photo.editedUrl || photo.originalUrl;
  if (!url) return NextResponse.json({ error: "No image" }, { status: 400 });

  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  let imageData: string;
  try {
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: "fetch failed" }, { status: 500 });
    const buf = Buffer.from(await res.arrayBuffer());
    imageData = buf.toString("base64");
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
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

    if (!resp.ok) return NextResponse.json({ error: "AI failed" }, { status: 500 });

    const data = await resp.json();
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();

    if (!text) return NextResponse.json({ error: "No caption generated" }, { status: 500 });

    await prisma.photo.update({
      where: { id: photoId },
      data: { caption: text },
    });

    return NextResponse.json({ caption: text });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}
