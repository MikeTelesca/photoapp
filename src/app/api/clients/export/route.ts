import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;

  const { userId, role } = authResult;

  const where = role === "admin" ? {} : { ownerId: userId };

  const clients = await prisma.client
    .findMany({
      where,
      include: {
        _count: { select: { jobs: true } },
        jobs: { select: { cost: true } },
      },
      orderBy: { name: "asc" },
    })
    .catch(() => []);

  const headers = ["Name", "Email", "Phone", "Company", "Job count", "Total spend ($)", "Notes", "Created"];
  const rows = clients.map((c: any) => [
    esc(c.name),
    esc(c.email || ""),
    esc(c.phone || ""),
    esc(c.company || ""),
    c._count?.jobs || 0,
    (c.jobs?.reduce((s: number, j: any) => s + (j.cost || 0), 0) || 0).toFixed(2),
    esc(c.notes || ""),
    c.createdAt?.toISOString().slice(0, 10) || "",
  ]);

  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function esc(s: string | number) {
  const str = String(s);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
