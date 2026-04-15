import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const templates = await prisma.jobTemplate.findMany({
    where: {
      recurrenceEnabled: true,
      recurrencePattern: { not: null },
    },
  }).catch(() => []);

  let created = 0;
  for (const tpl of templates) {
    const lastFired = (tpl as any).recurrenceLastFiredAt as Date | null;
    const pattern = (tpl as any).recurrencePattern as string;
    const now = Date.now();

    let intervalMs = 0;
    if (pattern === "weekly") intervalMs = 7 * 24 * 60 * 60 * 1000;
    else if (pattern === "biweekly") intervalMs = 14 * 24 * 60 * 60 * 1000;
    else if (pattern === "monthly") intervalMs = 30 * 24 * 60 * 60 * 1000;

    if (intervalMs === 0) continue;
    if (lastFired && now - lastFired.getTime() < intervalMs) continue;

    try {
      // Create a new job from template
      await prisma.job.create({
        data: {
          address: `${tpl.name} (auto)`,
          photographerId: tpl.ownerId,
          photographerName: (tpl as any).photographerName || "",
          clientName: (tpl as any).clientName || "",
          preset: tpl.preset || "standard",
          tvStyle: (tpl as any).tvStyle,
          skyStyle: (tpl as any).skyStyle,
          watermarkText: (tpl as any).watermarkText,
          tags: tpl.tags,
          notes: tpl.notes,
          status: "pending",
          totalPhotos: 0,
          processedPhotos: 0,
          approvedPhotos: 0,
          rejectedPhotos: 0,
          cost: 0,
          dropboxUrl: "",
        } as any,
      });

      await prisma.jobTemplate.update({
        where: { id: tpl.id },
        data: { recurrenceLastFiredAt: new Date() },
      });

      created++;
    } catch (err) {
      console.error("recurring err:", err);
    }
  }

  return NextResponse.json({ checked: templates.length, created });
}
