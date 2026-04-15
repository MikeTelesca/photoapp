import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { sendWebhook } from "@/lib/webhook";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { url } = await request.json();
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  const ok = await sendWebhook({
    url,
    title: "Test from ATH AI Editor",
    text: "If you see this, your webhook is wired up correctly!",
  });

  return NextResponse.json({ ok });
}
