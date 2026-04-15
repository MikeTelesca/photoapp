import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { Prisma } from "@/generated/prisma/client";

// GET /api/jobs/export-csv?status=...&tag=...&from=YYYY-MM-DD&to=YYYY-MM-DD
// Exports the authenticated user's jobs matching the filter as CSV.
export async function GET(request: NextRequest) {
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;
  const { userId, role } = authResult;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const tag = searchParams.get("tag");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const roleFilter = role === "admin" ? {} : { photographerId: userId };
  const where: Prisma.JobWhereInput = { ...roleFilter, deletedAt: null };

  if (status && status !== "all") {
    where.status = status;
  }

  if (tag) {
    // tags are stored as comma-separated; `contains` is a reasonable filter
    where.tags = { contains: tag };
  }

  if (from || to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) createdAt.gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        // inclusive end-of-day
        toDate.setHours(23, 59, 59, 999);
        createdAt.lte = toDate;
      }
    }
    if (createdAt.gte || createdAt.lte) {
      where.createdAt = createdAt;
    }
  }

  const jobs = await prisma.job.findMany({
    where,
    include: {
      photographer: { select: { id: true, name: true, jobSequencePrefix: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "JobNumber",
    "Address",
    "Client",
    "Status",
    "Preset",
    "TotalPhotos",
    "ApprovedPhotos",
    "RejectedPhotos",
    "Tags",
    "CostUSD",
    "CreatedAt",
    "UpdatedAt",
  ];

  const rows = jobs.map((j) => {
    const prefix = j.photographer?.jobSequencePrefix || "JOB";
    const jobNumber = j.sequenceNumber != null ? `${prefix}-${j.sequenceNumber}` : "";
    return [
      jobNumber,
      j.address || "",
      j.clientName || "",
      j.status || "",
      j.preset || "",
      j.totalPhotos ?? 0,
      j.approvedPhotos ?? 0,
      j.rejectedPhotos ?? 0,
      j.tags || "",
      (j.cost ?? 0).toFixed(2),
      j.createdAt.toISOString(),
      j.updatedAt.toISOString(),
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => esc(v)).join(","))
    .join("\n");

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const filename = `ath-jobs-${yyyy}${mm}${dd}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function esc(value: string | number): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
