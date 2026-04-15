import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notify";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const job = await prisma.job.findFirst({
    where: { shareToken: token, shareEnabled: true },
  });
  if (!job) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  const { fromName, fromEmail, message } = await request.json();
  if (!fromName || !message) {
    return NextResponse.json({ error: "Name and message required" }, { status: 400 });
  }

  const created = await prisma.shareRequest.create({
    data: {
      jobId: job.id,
      fromName: String(fromName).trim().slice(0, 100),
      fromEmail: fromEmail ? String(fromEmail).trim().slice(0, 200) : null,
      message: String(message).trim().slice(0, 2000),
    },
  });

  // Notify photographer
  await notify({
    userId: (job as any).photographerId,
    type: "client-comment",
    title: `${created.fromName} sent a request`,
    body: `On ${job.address}: ${created.message.slice(0, 100)}`,
    href: `/review/${job.id}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
