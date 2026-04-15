import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import PDFDocument from "pdfkit";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch photos that have pins
  const photos = await prisma.photo.findMany({
    where: { jobId, pins: { some: {} } },
    orderBy: { orderIndex: "asc" },
    include: { pins: true },
  }).catch(() => []);

  if (photos.length === 0) {
    return NextResponse.json({ error: "No annotated photos in this job" }, { status: 400 });
  }

  // Build PDF with one annotated photo per page
  const doc = new PDFDocument({ size: "LETTER", layout: "landscape", margin: 36 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // Cover
  doc.fontSize(20).font("Helvetica-Bold").text(`${job.address} — Annotated Review`, { align: "center" });
  doc.fontSize(10).font("Helvetica").fillColor("#666").text(
    `${photos.length} annotated photo${photos.length === 1 ? "" : "s"} · ${new Date().toLocaleDateString()}`,
    { align: "center" }
  );
  doc.moveDown(2);

  // Layout: image fills most of page, pins overlaid + numbered, notes listed below
  const PAGE_W = 792 - 72; // landscape letter minus margin
  const IMG_H = 380;

  for (let pIdx = 0; pIdx < photos.length; pIdx++) {
    const photo = photos[pIdx];
    if (pIdx > 0) doc.addPage();

    doc.fontSize(12).font("Helvetica-Bold").fillColor("#000").text(
      `Photo ${pIdx + 1} of ${photos.length}`,
      { align: "left" }
    );
    doc.moveDown(0.5);

    // Fetch and embed image
    const url = photo.editedUrl || photo.originalUrl;
    if (!url) continue;

    let imgBuf: Buffer | null = null;
    try {
      const res = await fetch(url);
      if (res.ok) imgBuf = Buffer.from(await res.arrayBuffer());
    } catch {
      // ignore fetch errors
    }

    const imgY = doc.y;
    const imgWidth = PAGE_W;

    if (imgBuf) {
      try {
        // Embed image
        doc.image(imgBuf, 36, imgY, { fit: [PAGE_W, IMG_H], align: "center" });
      } catch {
        // ignore image embed errors
      }
    }

    // Overlay pin labels (use fixed assumed image dims since we use fit)
    // Pin x/y are 0-100 percentages
    for (let i = 0; i < photo.pins.length; i++) {
      const pin = photo.pins[i];
      const px = 36 + (pin.x / 100) * imgWidth;
      const py = imgY + (pin.y / 100) * IMG_H;

      // Draw circle marker
      doc.circle(px, py, 8).fillAndStroke("#fbbf24", "#000");
      doc.fontSize(9).fillColor("#000").font("Helvetica-Bold")
        .text(String(i + 1), px - 3, py - 4);
    }

    // Notes list below
    doc.fontSize(11).fillColor("#000").font("Helvetica").text(
      "",
      36,
      imgY + IMG_H + 12
    );
    doc.font("Helvetica-Bold").text("Notes:");
    doc.font("Helvetica");

    for (let i = 0; i < photo.pins.length; i++) {
      const pin = photo.pins[i];
      doc.fontSize(10).text(`${i + 1}. ${pin.note}`, { paragraphGap: 2 });
    }
  }

  doc.end();
  const pdf = await pdfPromise;

  const addr = job.address.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${addr}-annotations.pdf"`,
    },
  });
}
