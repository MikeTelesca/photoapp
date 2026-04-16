import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// GET /api/dropbox/auth-url - redirects the user to Dropbox OAuth consent.
// token_access_type=offline asks Dropbox for a long-lived refresh token in
// addition to the short-lived access token, so we only do this dance once.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const appKey = process.env.DROPBOX_APP_KEY;
  if (!appKey) {
    return NextResponse.json({ error: "DROPBOX_APP_KEY not configured" }, { status: 500 });
  }

  const redirectUri = computeRedirectUri(req);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: appKey,
    token_access_type: "offline",
    redirect_uri: redirectUri,
  });
  return NextResponse.redirect(`https://www.dropbox.com/oauth2/authorize?${params.toString()}`);
}

function computeRedirectUri(req: NextRequest): string {
  const base = process.env.NEXTAUTH_URL || deriveBase(req);
  return `${base.replace(/\/$/, "")}/api/dropbox/callback`;
}

function deriveBase(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}
