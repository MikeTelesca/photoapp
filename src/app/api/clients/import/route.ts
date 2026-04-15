import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;

  const { userId } = authResult;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  const text = await file.text();
  const { rows, errors } = parseCsv(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid rows in CSV", parseErrors: errors }, { status: 400 });
  }

  let created = 0;
  let skipped = 0;
  const details: string[] = [];

  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) {
      skipped++;
      details.push("row missing name");
      continue;
    }

    const email = row.email?.trim() || null;

    // Skip if same-name client already exists for this user
    const existing = await prisma.client.findFirst({
      where: { ownerId: userId, name: { equals: name, mode: "insensitive" } },
    }).catch(() => null);
    if (existing) {
      skipped++;
      details.push(`"${name}" already exists`);
      continue;
    }

    try {
      await prisma.client.create({
        data: {
          name,
          email,
          phone: row.phone?.trim() || null,
          company: row.company?.trim() || null,
          notes: row.notes?.trim() || null,
          ownerId: userId,
        },
      });
      created++;
    } catch (err: any) {
      skipped++;
      details.push(`"${name}": ${err.message || "failed"}`);
    }
  }

  return NextResponse.json({ created, skipped, details: details.slice(0, 10) });
}

function parseCsv(text: string): { rows: Record<string, string>[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], errors: ["CSV must have a header and at least one data row"] };

  const headers = splitLine(lines[0]).map((h) => normalizeHeader(h));
  const rows: Record<string, string>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    if (cells.length === 0) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] || "";
    });
    rows.push(row);
  }

  return { rows, errors };
}

function splitLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && !inQuotes) inQuotes = true;
    else if (c === '"' && inQuotes && line[i + 1] === '"') {
      cur += '"';
      i++;
    } else if (c === '"' && inQuotes) inQuotes = false;
    else if (c === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else cur += c;
  }
  result.push(cur);
  return result;
}

function normalizeHeader(h: string): string {
  const key = h.toLowerCase().trim();
  // Map common variations
  if (key === "client name" || key === "full name") return "name";
  if (key === "e-mail" || key === "email address") return "email";
  if (key === "phone number" || key === "cell" || key === "mobile") return "phone";
  if (key === "agency" || key === "brokerage") return "company";
  return key;
}
