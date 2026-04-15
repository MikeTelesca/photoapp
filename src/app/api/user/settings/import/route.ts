import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

const ALLOWED_FIELDS = [
  "name",
  "businessName",
  "businessEmail",
  "businessPhone",
  "businessAddress",
  "invoiceRate",
  "invoicePrefix",
  "emailNotifications",
  "weeklyDigest",
  "dailySummary",
  "notifyJobReady",
  "notifyClientComment",
  "notifyPhotoFailed",
  "slackWebhookUrl",
  "timezone",
  "autoArchiveDays",
  "budgetPerJob",
  "promptPrefix",
  "emailSignature",
];

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || body.type !== "user-settings" || !body.settings) {
    return NextResponse.json({ error: "Invalid backup file" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  let applied = 0;
  for (const field of ALLOWED_FIELDS) {
    if (field in body.settings) {
      data[field] = body.settings[field];
      applied++;
    }
  }

  await prisma.user.update({
    where: { id: auth.userId },
    data,
  });

  return NextResponse.json({ ok: true, applied, fields: Object.keys(data) });
}
