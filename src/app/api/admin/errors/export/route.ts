import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const errors = await prisma.errorLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10000,
  }).catch(() => []);

  const headers = ["Date", "Source", "Message", "Job ID", "Photo ID", "User ID", "Metadata"];
  const rows = errors.map(err => [
    err.createdAt.toISOString(),
    esc(err.source),
    esc(err.message),
    err.jobId || "",
    err.photoId || "",
    err.userId || "",
    esc(err.metadata || ""),
  ]);

  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="errors-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function esc(s: any) {
  const str = String(s ?? "");
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
