import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getEmailTemplate } from "@/lib/email-templates-registry";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ template: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { template } = await params;
  const entry = getEmailTemplate(template);
  if (!entry) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }

  let html: string;
  try {
    html = entry.render();
  } catch (err) {
    console.error("[email-templates/preview] render failed:", err);
    return NextResponse.json({ error: "Render failed" }, { status: 500 });
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
