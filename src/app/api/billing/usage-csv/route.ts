import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "Invalid or missing ?month=YYYY-MM parameter" },
      { status: 400 }
    );
  }

  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  const start = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIdx + 1, 1, 0, 0, 0));

  const jobs = await prisma.job.findMany({
    where: {
      photographerId: auth.userId,
      updatedAt: { gte: start, lt: end },
    },
    orderBy: { updatedAt: "asc" },
  });

  const headers = [
    "Date",
    "JobID",
    "JobAddress",
    "Client",
    "PhotosProcessed",
    "TwilightCount",
    "CostUSD",
    "Preset",
    "Status",
  ];

  const rows = jobs.map((j) => [
    j.updatedAt.toISOString().slice(0, 10),
    j.id,
    j.address ?? "",
    j.clientName ?? "",
    String(j.processedPhotos ?? 0),
    String(j.twilightCount ?? 0),
    (j.cost ?? 0).toFixed(2),
    j.preset ?? "",
    j.status ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((r) => r.map(esc).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ath-usage-${month}.csv"`,
    },
  });
}

function esc(v: string | number): string {
  const str = String(v);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
