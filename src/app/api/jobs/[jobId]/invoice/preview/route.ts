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

  const ownerId = (job as any).photographerId || (job as any).ownerId;
  const user = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const client = (job as any).clientId
    ? await prisma.client.findUnique({ where: { id: (job as any).clientId } }).catch(() => null)
    : null;

  const businessName = (user as any).businessName || "ATH Media";
  const businessEmail = (user as any).businessEmail || user.email;
  const businessPhone = (user as any).businessPhone || "";
  const businessAddress = (user as any).businessAddress || "";
  const rate = (user as any).invoiceRate ?? 50;
  const photoCount = job.approvedPhotos || job.totalPhotos;
  const subtotal = photoCount * rate;
  const invoiceNum = `${(user as any).invoicePrefix || "INV"}-${String(((user as any).invoiceCounter || 1000)).padStart(4, "0")}`;

  return NextResponse.json({
    invoiceNum,
    business: { name: businessName, email: businessEmail, phone: businessPhone, address: businessAddress },
    client: client ? { name: client.name, email: client.email, phone: client.phone, company: client.company } : { name: job.clientName },
    job: {
      address: job.address,
      preset: job.preset,
      completedAt: job.createdAt,
    },
    lineItems: [
      {
        description: `Real estate photo editing (${job.preset})`,
        quantity: photoCount,
        rate,
        amount: subtotal,
      },
    ],
    subtotal,
    total: subtotal,
    today: new Date().toISOString(),
  });
}
