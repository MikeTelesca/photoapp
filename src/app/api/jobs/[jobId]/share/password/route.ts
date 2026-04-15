import { requireJobAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

/**
 * POST /api/jobs/[jobId]/share/password
 * Body: { password: string | null }
 *
 * - When `password` is null (or empty string), clears the share password.
 * - Otherwise hashes with bcrypt (cost 10) and stores the hash on the job.
 *
 * Also clears the legacy `sharePassword` field so the share page and verify
 * endpoint only need to consult `sharePasswordHash` going forward.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const authResult = await requireJobAccess(jobId);
  if ("error" in authResult) return authResult.error;

  const body = await req.json().catch(() => ({}));
  const password = body?.password;

  // Clear when null or empty string
  if (password === null || password === undefined || password === "") {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        sharePasswordHash: null,
        sharePasswordSalt: null,
        sharePassword: null,
      },
    });
    return NextResponse.json({ ok: true, passwordSet: false });
  }

  if (typeof password !== "string") {
    return NextResponse.json({ error: "password must be a string or null" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.job.update({
    where: { id: jobId },
    data: {
      sharePasswordHash: hash,
      // bcrypt embeds its salt in the hash; leave the dedicated column null.
      sharePasswordSalt: null,
      // Mirror to legacy column so existing code paths continue to work.
      sharePassword: hash,
    },
  });

  return NextResponse.json({ ok: true, passwordSet: true });
}
