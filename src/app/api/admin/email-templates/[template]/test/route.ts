import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getEmailTemplate } from "@/lib/email-templates-registry";
import { sendEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ template: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { template } = await params;
  const entry = getEmailTemplate(template);
  if (!entry) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }

  let body: { to?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!to || !EMAIL_RE.test(to)) {
    return NextResponse.json({ error: "Valid 'to' email required" }, { status: 400 });
  }

  let html: string;
  try {
    html = entry.render();
  } catch (err) {
    console.error("[email-templates/test] render failed:", err);
    return NextResponse.json({ error: "Render failed" }, { status: 500 });
  }

  const subject = `[TEST] ${entry.subject}`;
  const sent = await sendEmail({ to, subject, html });

  return NextResponse.json({ ok: true, sent, to, template: entry.key });
}
