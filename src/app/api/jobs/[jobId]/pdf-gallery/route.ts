import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import PDFDocument from "pdfkit";

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
    where: { jobId, status: "approved" },
    orderBy: { orderIndex: "asc" },
  });
  if (photos.length === 0) {
    return NextResponse.json({ error: "No approved photos" }, { status: 400 });
  }

  // Get photographer's business info
  const ownerId = (job as any).photographerId || (job as any).ownerId;
  const user = await prisma.user.findUnique({ where: { id: ownerId } });
  const businessName = (user as any)?.businessName || "ATH Media";

  // Fetch all photos into memory
  const photoBuffers: Buffer[] = [];
  for (const p of photos) {
    const url = p.editedUrl || p.originalUrl;
    if (!url) continue;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        photoBuffers.push(buf);
      }
    } catch (err) {
      console.error("pdf gallery fetch err:", err);
    }
  }

  const doc = new PDFDocument({ size: "LETTER", layout: "landscape", margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // Cover page
  doc.fontSize(32).font("Helvetica-Bold").fillColor("#111").text(businessName, { align: "center" });
  doc.moveDown(3);
  doc.fontSize(42).fillColor("#0891b2").text(job.address, { align: "center" });
  doc.moveDown(2);
  doc.fontSize(14).fillColor("#666").font("Helvetica").text(`${photos.length} photos · ${job.preset} edit`, { align: "center" });
  if ((job as any).clientName) {
    doc.moveDown();
    doc.fontSize(12).fillColor("#999").text(`Prepared for ${(job as any).clientName}`, { align: "center" });
  }
  doc.moveDown(4);
  doc.fontSize(10).fillColor("#bbb").text(new Date().toLocaleDateString(), { align: "center" });

  const hasDescription = !!((job as any).listingDescription);

  // MLS description page (if exists)
  if (hasDescription) {
    doc.addPage();
    doc.fontSize(20).font("Helvetica-Bold").fillColor("#111").text("Property Description", { align: "center" });
    doc.moveDown(1.5);
    doc.fontSize(11).font("Helvetica").fillColor("#333").text((job as any).listingDescription, {
      align: "left",
      lineGap: 4,
    });
  }

  // Photo pages — 2 photos per page (landscape)
  // LETTER landscape: 792w x 612h, margins 40 each side
  const pageWidth = 792 - 80; // 712
  const photoWidth = (pageWidth - 20) / 2; // 346
  const photoHeight = 280;
  const totalPhotoPages = Math.ceil(photoBuffers.length / 2);
  // Cover = page 1, optional description = page 2 (if hasDescription), photos start after
  const preamblePages = hasDescription ? 2 : 1;
  const totalPages = preamblePages + totalPhotoPages + 1; // +1 for footer

  for (let i = 0; i < photoBuffers.length; i += 2) {
    doc.addPage();
    const y = (612 - photoHeight) / 2; // center vertically
    const pageNum = preamblePages + Math.floor(i / 2) + 1;

    try {
      doc.image(photoBuffers[i], 40, y, {
        width: photoWidth,
        height: photoHeight,
        fit: [photoWidth, photoHeight],
      });
    } catch (err) {
      console.error("pdf img err:", err);
    }

    if (photoBuffers[i + 1]) {
      try {
        doc.image(photoBuffers[i + 1], 40 + photoWidth + 20, y, {
          width: photoWidth,
          height: photoHeight,
          fit: [photoWidth, photoHeight],
        });
      } catch (err) {
        console.error("pdf img err:", err);
      }
    }

    // Page number
    doc.fontSize(8).fillColor("#999").font("Helvetica")
      .text(`Page ${pageNum} / ${totalPages}`, 40, 592, { align: "center", width: pageWidth });
  }

  // Footer / thank you page
  doc.addPage();
  doc.fontSize(14).fillColor("#111").font("Helvetica-Bold").text("Thank you", { align: "center" });
  doc.moveDown(2);
  doc.fontSize(11).fillColor("#555").font("Helvetica").text(`Photography by ${businessName}`, { align: "center" });
  if ((user as any)?.businessEmail) {
    doc.text((user as any).businessEmail, { align: "center" });
  }
  if ((user as any)?.businessPhone) {
    doc.text((user as any).businessPhone, { align: "center" });
  }

  doc.end();
  const pdf = await pdfPromise;

  const addr = job.address.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${addr}-gallery.pdf"`,
    },
  });
}
