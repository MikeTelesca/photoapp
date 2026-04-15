import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { checkRate } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string }> }
) {
  const { jobId, photoId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;
  const rateErr = checkRate(access.userId, "ai-lite");
  if (rateErr) return rateErr;

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = photo.editedUrl || photo.originalUrl;
  if (!url) return NextResponse.json({ error: "No image" }, { status: 400 });

  let imageData: string;
  try {
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: "fetch failed" }, { status: 500 });
    const buf = Buffer.from(await res.arrayBuffer());
    imageData = buf.toString("base64");
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 500 });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const prompt = `Write a single-sentence caption for this real estate photo. Optimized for MLS / accessibility / alt text:
- Maximum 20 words
- Describe the room type and 2-3 standout features
- Use plain professional language
- Don't start with "Image of" or "Photo of"
- Don't make up things you can't see (square footage, brand names, price)

Output ONLY the caption text. No quotes, no preamble.`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: imageData } },
            ],
          }],
        }),
      }
    );

    if (!resp.ok) return NextResponse.json({ error: "AI failed" }, { status: 500 });

    const data = await resp.json();
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();

    if (!text) return NextResponse.json({ error: "No caption generated" }, { status: 500 });

    // Save
    await prisma.photo.update({
      where: { id: photoId },
      data: { caption: text },
    });

    return NextResponse.json({ caption: text });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
