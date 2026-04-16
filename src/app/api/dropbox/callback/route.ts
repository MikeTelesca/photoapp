import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { log } from "@/lib/logger";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
};

// GET /api/dropbox/callback?code=XYZ - exchanges auth code for tokens.
// On success redirects back to /settings/dropbox with tokens in query string
// so the UI can show them in copyable form. Admin-only.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (session.user.role !== "admin") {
    return NextResponse.redirect(new URL("/jobs", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(buildSettingsUrl(req, { error: oauthError }));
  }
  if (!code) {
    return NextResponse.redirect(buildSettingsUrl(req, { error: "missing_code" }));
  }

  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;
  if (!appKey || !appSecret) {
    return NextResponse.redirect(buildSettingsUrl(req, { error: "app_not_configured" }));
  }

  const redirectUri = computeRedirectUri(req);
  const form = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: appKey,
    client_secret: appSecret,
    redirect_uri: redirectUri,
  });

  try {
    const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = (await res.json()) as TokenResponse;
    if (!res.ok || !data.refresh_token) {
      log.warn("dropbox.callback.exchange_failed", {
        status: res.status,
        error: data.error,
        description: data.error_description,
      });
      return NextResponse.redirect(
        buildSettingsUrl(req, { error: data.error || `http_${res.status}` }),
      );
    }
    log.info("dropbox.callback.ok", { hasRefresh: !!data.refresh_token });
    return NextResponse.redirect(
      buildSettingsUrl(req, {
        refresh_token: data.refresh_token,
        access_token: data.access_token ?? "",
      }),
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "exchange_failed";
    log.error("dropbox.callback.network_failed", { err: msg });
    return NextResponse.redirect(buildSettingsUrl(req, { error: "network_failed" }));
  }
}

function buildSettingsUrl(req: NextRequest, params: Record<string, string>): URL {
  const url = new URL("/settings/dropbox", req.url);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  return url;
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
