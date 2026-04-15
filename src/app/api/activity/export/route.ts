import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  // Admins get all; regular users get only theirs
  const where = auth.role === "admin" ? {} : { userId: auth.userId };

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10000,
  }).catch(() => []);

  const headers = ["Date", "Type", "Message", "Job ID", "Photo ID", "User ID", "Metadata"];
  const rows = logs.map((log: any) => [
    log.createdAt.toISOString(),
    esc(log.type),
    esc(log.message),
    log.jobId || "",
    log.photoId || "",
    log.userId || "",
    esc(typeof log.metadata === "string" ? log.metadata : JSON.stringify(log.metadata || {})),
  ]);

  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="activity-${new Date().toISOString().slice(0, 10)}.csv"`,
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
