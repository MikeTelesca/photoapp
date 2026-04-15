import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import PDFDocument from "pdfkit";
import { logDownload } from "@/lib/download-log";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const job = await prisma.job
    .findUnique({
      where: { id: jobId },
      include: { client: true, photographer: true } as any,
    })
    .catch(() => null);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get user for business info — use the job's owner/photographer
  const ownerId = (job as any).photographerId || (job as any).ownerId;
  const user = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Build the PDF in memory
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const businessName = (user as any).businessName || "ATH Media";
  const businessAddr = [
    (user as any).businessAddress,
    (user as any).businessEmail,
    (user as any).businessPhone,
  ]
    .filter(Boolean)
    .join(" · ");
  const rate = (user as any).invoiceRate ?? 50;
  const photoCount = job.approvedPhotos || job.totalPhotos;
  const subtotal = photoCount * rate;
  const invoiceNum = `${(user as any).invoicePrefix || "INV"}-${String((user as any).invoiceCounter || 1000).padStart(4, "0")}`;

  // Header
  doc.fontSize(22).font("Helvetica-Bold").text(businessName);
  if (businessAddr)
    doc.fontSize(9).font("Helvetica").fillColor("#666").text(businessAddr);
  doc.moveDown(2);

  // Invoice title
  doc
    .fontSize(28)
    .font("Helvetica-Bold")
    .fillColor("#000")
    .text("INVOICE", { align: "right" });
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#666")
    .text(`#${invoiceNum}`, { align: "right" });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: "right" });
  doc.moveDown(2);

  // Bill to
  const client = (job as any).client;
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#000")
    .text("Bill To:");
  doc.font("Helvetica");
  if (client?.name) doc.text(client.name);
  else if (job.clientName) doc.text(job.clientName);
  if (client?.email) doc.text(client.email);
  if (client?.phone) doc.text(client.phone);
  if (client?.company) doc.text(client.company);
  doc.moveDown(1.5);

  // Job details
  doc.font("Helvetica-Bold").text("Job:");
  doc.font("Helvetica").text(job.address);
  doc.text(`Completed: ${job.createdAt.toLocaleDateString()}`);
  doc.moveDown(1.5);

  // Line item table
  const tableTop = doc.y;
  doc.font("Helvetica-Bold");
  doc.text("Description", 50, tableTop);
  doc.text("Qty", 350, tableTop, { width: 60, align: "right" });
  doc.text("Rate", 410, tableTop, { width: 70, align: "right" });
  doc.text("Amount", 480, tableTop, { width: 70, align: "right" });
  doc
    .moveTo(50, tableTop + 15)
    .lineTo(550, tableTop + 15)
    .strokeColor("#ccc")
    .stroke();

  doc.font("Helvetica");
  doc.text(
    `Real estate photo editing (${job.preset})`,
    50,
    tableTop + 22
  );
  doc.text(String(photoCount), 350, tableTop + 22, {
    width: 60,
    align: "right",
  });
  doc.text(`$${rate.toFixed(2)}`, 410, tableTop + 22, {
    width: 70,
    align: "right",
  });
  doc.text(`$${subtotal.toFixed(2)}`, 480, tableTop + 22, {
    width: 70,
    align: "right",
  });

  doc.moveTo(50, tableTop + 45).lineTo(550, tableTop + 45).stroke();

  // Total
  doc.font("Helvetica-Bold").fontSize(12);
  doc.text("Total", 400, tableTop + 55, { width: 70, align: "right" });
  doc.text(`$${subtotal.toFixed(2)}`, 470, tableTop + 55, {
    width: 80,
    align: "right",
  });

  // Footer
  doc.fontSize(9).font("Helvetica").fillColor("#666");
  doc.text(
    "Payment due within 14 days. Thank you for your business.",
    50,
    720,
    { align: "center" }
  );

  doc.end();
  const pdfBuffer = await pdfPromise;

  // Increment invoice counter
  await prisma.user
    .update({
      where: { id: user.id },
      data: { invoiceCounter: { increment: 1 } },
    })
    .catch(() => {});

  // Mark invoice as sent
  await prisma.job
    .update({
      where: { id: jobId },
      data: { invoiceSentAt: new Date() },
    })
    .catch(() => {});

  await logDownload({
    userId: access.userId,
    jobId,
    type: "invoice",
  }).catch(() => {});

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoiceNum}.pdf"`,
    },
  });
}
