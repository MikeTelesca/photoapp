import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = await prisma.photo.findMany({
    where: { jobId },
    orderBy: { orderIndex: "asc" },
  });

  const headers = [
    "Index",
    "Photo ID",
    "Status",
    "Favorite",
    "Flagged",
    "Caption",
    "Auto Tags",
    "Quality Flags",
    "Rejection Reason",
    "Note",
    "Edited URL",
    "Original URL",
    "Created",
    "Updated",
  ];

  const rows = photos.map((p, idx) => [
    String(idx + 1),
    p.id,
    p.status,
    p.isFavorite ? "yes" : "",
    p.flagged ? "yes" : "",
    esc(p.caption || ""),
    esc(p.autoTags || ""),
    esc(p.qualityFlags || ""),
    esc(p.rejectionReason || ""),
    esc(p.note || ""),
    p.editedUrl || "",
    p.originalUrl || "",
    p.createdAt.toISOString(),
    p.updatedAt.toISOString(),
  ]);

  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");

  const addr = job.address.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${addr}-photos.csv"`,
    },
  });
}

function esc(s: string | number) {
  const str = String(s ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
