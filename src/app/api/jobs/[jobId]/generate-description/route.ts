import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export const maxDuration = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = await prisma.photo.findMany({
    where: { jobId, status: "approved" },
    orderBy: { orderIndex: "asc" },
    take: 12, // cap to 12 photos for API payload size
  });

  if (photos.length === 0) {
    return NextResponse.json({ error: "No approved photos" }, { status: 400 });
  }

  // Fetch image bytes + base64 encode
  const imageParts: any[] = [];
  for (const photo of photos) {
    const url = photo.editedUrl || photo.originalUrl;
    if (!url) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      imageParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: buf.toString("base64"),
        },
      });
    } catch (e) {
      console.error("desc gen fetch:", e);
    }
  }

  const prompt = `You are a professional real estate copywriter. Write a compelling MLS listing description (200-350 words) for this property based on the photos.

Property address: ${job.address}

Guidelines:
- Highlight standout features visible in the photos (updated kitchen, hardwood floors, natural light, outdoor spaces, etc.)
- Use warm, aspirational language without being corny
- Mention specific rooms and their key features
- End with a call to action ("Schedule your showing today" etc.)
- Do NOT make up facts you can't see (bedroom counts, square footage, neighborhood specifics)
- Keep sentences varied in length

Write ONLY the description text. No preamble, no bullet points unless natural, no markdown headers.`;

  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }, ...imageParts],
        }],
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    console.error("Gemini err:", err);
    return NextResponse.json({ error: "AI failed", details: err }, { status: 500 });
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return NextResponse.json({ error: "No output" }, { status: 500 });
  }

  // Save to job.listingDescription field
  await (prisma.job.update({
    where: { id: jobId },
    data: { listingDescription: text } as any,
  }) as Promise<any>).catch((err: any) => console.error("save desc err:", err));

  return NextResponse.json({ description: text });
}
