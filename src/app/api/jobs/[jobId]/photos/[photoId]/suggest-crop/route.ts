import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { checkRate } from "@/lib/rate-limit";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; photoId: string }> }
) {
  const { jobId, photoId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;
  const rateErr = await checkRate(access.userId, "ai-lite");
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

  const prompt = `Analyze this real estate photo. Identify the most important subject/composition and suggest an ideal crop rectangle.

Rules:
- Return coordinates as percentages (0-100) of the image dimensions
- The crop should preserve the main architectural subject
- Don't crop too aggressively — keep at least 70% of the original width
- For interior shots, keep rule-of-thirds composition
- Preserve ceilings and key features

Return JSON ONLY (no markdown):
{
  "x": 0-100 (left edge %),
  "y": 0-100 (top edge %),
  "width": 0-100 (width %),
  "height": 0-100 (height %),
  "reasoning": "one sentence why"
}`;

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

    if (!resp.ok) {
      const err = await resp.text();
      return NextResponse.json({ error: "AI failed", details: err }, { status: 500 });
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = text.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Validate
    if (
      typeof parsed.x !== "number" || typeof parsed.y !== "number" ||
      typeof parsed.width !== "number" || typeof parsed.height !== "number"
    ) {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
