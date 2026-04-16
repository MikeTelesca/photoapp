import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";
import { createFolder, sanitizeFolderName } from "@/lib/dropbox";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

// GET /api/jobs/:jobId/upload-config
//
// Returns everything the browser needs to upload files DIRECTLY to Dropbox,
// bypassing our serverless function's 4.5MB body cap. The access token is
// short-lived and minted via the stored refresh token.
//
// Response: { accessToken, folderPath, expiresInSec }
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { agent: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  if (!appKey || !appSecret || !refreshToken) {
    return NextResponse.json(
      { error: "Dropbox is not configured for direct upload (missing refresh token)" },
      { status: 503 },
    );
  }

  // Mint a short-lived access token via the refresh token flow
  let tokenResponse: Response;
  try {
    tokenResponse = await fetch("https://api.dropbox.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: appKey,
        client_secret: appSecret,
      }),
      cache: "no-store",
    });
  } catch (err: unknown) {
    log.error("upload-config.token_exchange_network", {
      jobId,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Could not reach Dropbox" }, { status: 502 });
  }

  if (!tokenResponse.ok) {
    const txt = await tokenResponse.text();
    log.error("upload-config.token_exchange_failed", {
      jobId,
      status: tokenResponse.status,
      body: txt.slice(0, 500),
    });
    return NextResponse.json(
      { error: "Dropbox token exchange failed — check DROPBOX_REFRESH_TOKEN" },
      { status: 502 },
    );
  }

  const tokenJson = (await tokenResponse.json()) as { access_token?: string; expires_in?: number };
  const accessToken = tokenJson.access_token;
  const expiresIn = tokenJson.expires_in ?? 14400;
  if (!accessToken) {
    return NextResponse.json({ error: "No access token returned" }, { status: 502 });
  }

  // Pre-create the destination folder so the first upload doesn't fail on a
  // missing parent. Uses our server-side SDK helper; client uploads land here.
  const folderPath = job.agent?.dropboxFolder
    ? `${job.agent.dropboxFolder}/${sanitizeFolderName(job.address)}`
    : `/BatchBase/_uploads/${jobId}`;

  try {
    await createFolder("/BatchBase");
  } catch {
    /* non-fatal */
  }
  if (folderPath.startsWith("/BatchBase/_uploads/")) {
    try {
      await createFolder("/BatchBase/_uploads");
    } catch {
      /* non-fatal */
    }
  }
  try {
    await createFolder(folderPath);
  } catch (err) {
    log.warn("upload-config.create_folder_failed", {
      jobId,
      folderPath,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({
    accessToken,
    folderPath,
    expiresInSec: expiresIn,
  });
}
