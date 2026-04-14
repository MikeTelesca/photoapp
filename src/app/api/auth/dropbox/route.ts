import { NextRequest, NextResponse } from "next/server";

// GET /api/auth/dropbox - handle OAuth callback from Dropbox
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    // Step 1: Redirect to Dropbox authorization
    const appKey = process.env.DROPBOX_APP_KEY;
    const redirectUri = `${request.nextUrl.origin}/api/auth/dropbox`;
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${appKey}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&token_access_type=offline`;
    return NextResponse.redirect(authUrl);
  }

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
    // In production, you'd store this in the database
    // For now, display it so the user can add it to env vars
    return new NextResponse(
      `<html>
        <body style="font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px;">
          <h2>Dropbox Connected!</h2>
          <p>Add these to your environment variables:</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0; word-break: break-all;">
            <strong>DROPBOX_REFRESH_TOKEN=</strong>${tokenData.refresh_token}
          </div>
          <p>Access token (expires in ${tokenData.expires_in}s): <code style="font-size: 11px;">${tokenData.access_token?.substring(0, 30)}...</code></p>
          <p><a href="/settings">← Back to Settings</a></p>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return NextResponse.json({ error: "Failed to get refresh token", details: tokenData }, { status: 400 });
}
