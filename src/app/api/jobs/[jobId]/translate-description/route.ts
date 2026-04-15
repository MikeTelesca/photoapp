import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { checkRate } from "@/lib/rate-limit";

export const maxDuration = 60;

const SUPPORTED = ["es", "fr", "zh", "pt", "de", "it"];

const NAMES: Record<string, string> = {
  es: "Spanish",
  fr: "French",
  zh: "Mandarin Chinese",
  pt: "Portuguese",
  de: "German",
  it: "Italian",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;
  const rateErr = checkRate(access.userId, "ai-lite");
  if (rateErr) return rateErr;

  const { language } = await request.json();
  if (!SUPPORTED.includes(language)) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job?.listingDescription) {
    return NextResponse.json({ error: "No listing description to translate. Generate one first." }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const prompt = `Translate this real estate listing description into ${NAMES[language]}.

Rules:
- Maintain the warm, aspirational marketing tone
- Adapt idioms naturally (don't translate word-for-word)
- Keep the same paragraph structure
- Use real estate terminology native to the target market
- Output ONLY the translated text — no preamble, no notes

Original (English):
${job.listingDescription}`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!resp.ok) return NextResponse.json({ error: "AI failed" }, { status: 500 });

    const data = await resp.json();
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    if (!text) return NextResponse.json({ error: "No output" }, { status: 500 });

    return NextResponse.json({ language, translation: text });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
