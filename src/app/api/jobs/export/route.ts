import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const jobs = await prisma.job.findMany({
    where: { status: { not: "deleted" }, photographerId: auth.userId },
    orderBy: { createdAt: "desc" },
  });

  const headers = ["Date", "Address", "Client", "Photographer", "Preset", "Status", "Total Photos", "Approved", "Cost ($)"];
  const rows = jobs.map(j => [
    j.createdAt.toISOString().slice(0, 10),
    esc(j.address),
    esc(j.clientName || ""),
    "", // photographer name will be filled separately if needed
    j.preset,
    j.status,
    j.totalPhotos,
    j.approvedPhotos,
    j.cost.toFixed(2),
  ]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="jobs-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function esc(s: string | number) {
  const str = String(s);
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
