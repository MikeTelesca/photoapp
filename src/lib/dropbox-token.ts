/**
 * Automatic Dropbox token management.
 * Uses refresh tokens when available to auto-renew access tokens.
 * Falls back to static access token for development.
 */

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let cache: TokenCache | null = null;

/**
 * Get a valid Dropbox access token.
 * If DROPBOX_REFRESH_TOKEN is set, automatically refreshes when expired.
 * Otherwise falls back to DROPBOX_ACCESS_TOKEN (which may expire).
 */
export async function getDropboxAccessToken(): Promise<string> {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;

  // If no refresh token, use the static access token
  if (!refreshToken || !appKey || !appSecret) {
    const staticToken = process.env.DROPBOX_ACCESS_TOKEN;
    if (!staticToken) {
      throw new Error("No Dropbox credentials configured. Set DROPBOX_REFRESH_TOKEN + DROPBOX_APP_KEY + DROPBOX_APP_SECRET, or fallback DROPBOX_ACCESS_TOKEN.");
    }
    return staticToken;
  }

  // Return cached token if still valid (with 5 min buffer)
  const now = Date.now();
  if (cache && cache.expiresAt > now + 5 * 60 * 1000) {
    return cache.accessToken;
  }

  // Refresh the access token
  const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: appKey,
      client_secret: appSecret,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to refresh Dropbox access token: ${errText}`);
  }

  const data = await response.json();
  const expiresIn = data.expires_in || 14400; // default 4 hours

  cache = {
    accessToken: data.access_token,
    expiresAt: now + expiresIn * 1000,
  };

  console.log(`[dropbox-token] Refreshed access token, expires in ${expiresIn}s`);
  return cache.accessToken;
}
