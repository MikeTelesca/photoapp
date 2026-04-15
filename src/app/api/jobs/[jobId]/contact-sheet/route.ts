import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import PDFDocument from "pdfkit";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = await prisma.photo.findMany({
    where: { jobId, status: { in: ["edited", "approved", "rejected"] } },
    orderBy: { orderIndex: "asc" },
  });

  if (photos.length === 0) {
    return NextResponse.json({ error: "No photos" }, { status: 400 });
  }

  // Letter portrait
  const doc = new PDFDocument({ size: "LETTER", margin: 36 });
  const chunks: Buffer[] = [];
  doc.on("data", c => chunks.push(c));
  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // Header
  doc.fontSize(16).font("Helvetica-Bold").text(`${job.address} — Contact Sheet`, { align: "center" });
  doc.fontSize(9).font("Helvetica").fillColor("#666").text(
    `${photos.length} photos · ${job.preset} · ${new Date().toLocaleDateString()}`,
    { align: "center" }
  );
  doc.moveDown(0.5);

  // Layout: 4 columns × 6 rows = 24 thumbnails per page
  const COLS = 4;
  const ROWS_PER_PAGE = 6;
  const PER_PAGE = COLS * ROWS_PER_PAGE;
  const PAGE_WIDTH = 612 - 72; // letter - margins
  const CELL_WIDTH = PAGE_WIDTH / COLS;
  const CELL_PAD = 4;
  const THUMB_WIDTH = CELL_WIDTH - CELL_PAD * 2;
  const THUMB_HEIGHT = THUMB_WIDTH * 0.667; // 3:2 aspect
  const LABEL_HEIGHT = 12;
  const ROW_HEIGHT = THUMB_HEIGHT + LABEL_HEIGHT + 4;

  // Fetch + thumbnail each photo
  const thumbs: Array<{ buffer: Buffer | null; index: number; status: string }> = [];
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const url = p.editedUrl || p.originalUrl;
    if (!url) {
      thumbs.push({ buffer: null, index: i + 1, status: p.status });
      continue;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) {
        thumbs.push({ buffer: null, index: i + 1, status: p.status });
        continue;
      }
      const src = Buffer.from(await res.arrayBuffer());
      const small = await sharp(src)
        .resize(Math.round(THUMB_WIDTH * 2), Math.round(THUMB_HEIGHT * 2), { fit: "cover" })
        .jpeg({ quality: 75 })
        .toBuffer();
      thumbs.push({ buffer: small, index: i + 1, status: p.status });
    } catch (err) {
      thumbs.push({ buffer: null, index: i + 1, status: p.status });
    }
  }

  // Render thumbs
  let y = doc.y;
  for (let i = 0; i < thumbs.length; i++) {
    if (i > 0 && i % PER_PAGE === 0) {
      doc.addPage();
      y = doc.y;
    }
    const localIdx = i % PER_PAGE;
    const col = localIdx % COLS;
    const row = Math.floor(localIdx / COLS);
    const x = 36 + col * CELL_WIDTH + CELL_PAD;
    const cellY = y + row * ROW_HEIGHT;

    const t = thumbs[i];
    if (t.buffer) {
      try {
        doc.image(t.buffer, x, cellY, { width: THUMB_WIDTH, height: THUMB_HEIGHT, fit: [THUMB_WIDTH, THUMB_HEIGHT] });
      } catch {}
    } else {
      doc.rect(x, cellY, THUMB_WIDTH, THUMB_HEIGHT).fillAndStroke("#eee", "#ccc");
      doc.fontSize(8).fillColor("#999").text("(no image)", x, cellY + THUMB_HEIGHT / 2 - 4, { width: THUMB_WIDTH, align: "center" });
    }

    // Label
    doc.fontSize(7).fillColor("#444").font("Helvetica");
    const statusLabel = t.status === "approved" ? " ✓" : t.status === "rejected" ? " ✗" : "";
    doc.text(`#${t.index}${statusLabel}`, x, cellY + THUMB_HEIGHT + 2, { width: THUMB_WIDTH, align: "center" });
  }

  doc.end();
  const pdfBuffer = await pdfPromise;

  const addr = job.address.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${addr}-contact-sheet.pdf"`,
    },
  });
}
