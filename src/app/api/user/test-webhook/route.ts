import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { sendSlackNotification } from "@/lib/slack";

export async function POST(_request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const ok = await sendSlackNotification(
    auth.userId,
    "Test message from ATH AI Editor"
  );

  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "No Slack webhook URL saved, or delivery failed. Save a URL first." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
