import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { checkRate } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const rateErr = checkRate(access.userId, "ai-lite");
  if (rateErr) return rateErr;

  // Get 3 sample photos from the job (first, middle, last if available)
  const photos = await prisma.photo.findMany({
    where: { jobId, editedUrl: { not: null } },
    orderBy: { orderIndex: "asc" },
  });

  if (photos.length === 0) {
    return NextResponse.json({ error: "No photos to analyze" }, { status: 400 });
  }

  const samples = [photos[0]];
  if (photos.length > 2) samples.push(photos[Math.floor(photos.length / 2)]);
  if (photos.length > 1) samples.push(photos[photos.length - 1]);

  const imageParts: any[] = [];
  for (const photo of samples) {
    const url = photo.editedUrl || photo.originalUrl;
    if (!url) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      imageParts.push({
        inlineData: { mimeType: "image/jpeg", data: buf.toString("base64") },
      });
    } catch (e) { console.error("fetch err:", e); }
  }

  const prompt = `You are an expert real estate photo editor. Analyze these sample photos of a property and suggest the BEST editing preset from these options:

- "standard": Balanced exposure + window pull. Good for most mid-range homes.
- "bright": Lighter, warmer tones. Good for modern / Scandinavian / beach homes with lots of natural light.
- "luxury": Rich contrast, magazine feel. Good for high-end homes with premium finishes, dramatic ceilings, pools, architectural detail.
- "flambient": HDR + flash-fill look. Clean, minimal noise. Good for tight interiors, dark spaces, or when twilight is needed.

Respond in JSON format ONLY (no markdown, no preamble):
{
  "preset": "standard" | "bright" | "luxury" | "flambient",
  "confidence": 0.0-1.0,
  "reasoning": "one sentence why"
}`;

  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, ...imageParts] }],
      }),
    }
  );

  if (!resp.ok) {
    return NextResponse.json({ error: "AI failed" }, { status: 500 });
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Parse the JSON, tolerating wrapping markdown
  const cleaned = text.replace(/```json\n?|```/g, "").trim();
  let parsed: any = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: "AI gave invalid response", raw: text }, { status: 500 });
  }

  return NextResponse.json(parsed);
}
