import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { checkRate } from "@/lib/rate-limit";
import { enhancePhoto } from "@/lib/ai-enhance";

export const maxDuration = 120;
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const rateErr = checkRate(auth.userId, "enhance");
  if (rateErr) return rateErr;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const prompt = (formData.get("prompt") as string) || "";

  if (!file || !prompt) {
    return NextResponse.json({ error: "file and prompt required" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/jpeg";

  try {
    // Pass a non-existent preset so enhancePhoto falls through to using the
    // custom prompt as the base prompt (see ai-enhance.ts lines 162-165).
    const result = await enhancePhoto(buf, mime, "custom", prompt);
    if (!result.success || !result.imageBase64) {
      return NextResponse.json(
        { error: result.error || "Enhance returned no image" },
        { status: 500 }
      );
    }
    const dataUrl = `data:${result.mimeType || "image/jpeg"};base64,${result.imageBase64}`;
    return NextResponse.json({ dataUrl, model: "gemini" });
  } catch (err: any) {
    console.error("playground err:", err);
    return NextResponse.json({ error: err.message || "Enhance failed" }, { status: 500 });
  }
}
