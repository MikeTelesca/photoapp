import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { requireAdmin } from "@/lib/api-auth";

// GET /api/auth/dropbox - handle OAuth callback from Dropbox (admin only)
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    // Step 1: Redirect to Dropbox authorization with CSRF state
    const appKey = process.env.DROPBOX_APP_KEY;
    const redirectUri = `${request.nextUrl.origin}/api/auth/dropbox`;

    // Generate CSRF state token
    const state = crypto.randomBytes(16).toString("hex");
    const cookieStore = await cookies();
    cookieStore.set("dropbox_oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${appKey}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&token_access_type=offline&state=${state}`;
    return NextResponse.redirect(authUrl);
  }

  // Step 1.5: Verify CSRF state parameter
  const returnedState = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("dropbox_oauth_state")?.value;

  if (!returnedState || !expectedState || returnedState !== expectedState) {
    return NextResponse.json(
      { error: "Invalid state parameter (CSRF protection)" },
      { status: 400 }
    );
  }

  // Clear the state cookie after verification
  cookieStore.delete("dropbox_oauth_state");

  // Step 2: Exchange code for refresh token
  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;
  const redirectUri = `${request.nextUrl.origin}/api/auth/dropbox`;

  const tokenResponse = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: appKey || "",
      client_secret: appSecret || "",
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.refresh_token) {
    // Log to console for admin to pick up from Vercel logs (most secure)
    console.log("[DROPBOX OAUTH] Refresh token generated:", tokenData.refresh_token);

    return new NextResponse(
      `<html>
        <head><title>Dropbox Connected</title></head>
        <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px;">
          <h2>✅ Dropbox Connected Successfully</h2>
          <p>Refresh token has been logged to the Vercel deployment logs. An admin should copy it from there and add it as DROPBOX_REFRESH_TOKEN in Vercel environment variables.</p>
          <p><a href="/settings">← Back to Settings</a></p>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return NextResponse.json(
    { error: "Failed to get refresh token", details: tokenData },
    { status: 400 }
  );
}
