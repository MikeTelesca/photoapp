import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

const SETTING_FIELDS = [
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
  "watermarkLogoPath",
];

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: SETTING_FIELDS.reduce(
      (acc, k) => ({ ...acc, [k]: true }),
      {} as Record<string, boolean>
    ),
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = {
    app: "ath-editor",
    type: "user-settings",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: user,
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="ath-settings-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
