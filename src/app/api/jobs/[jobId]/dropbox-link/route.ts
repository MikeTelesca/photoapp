import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireJobAccess } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/jobs/:jobId/dropbox-link - get a sharable link to the edited photos folder
export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const access = await requireJobAccess(jobId);
  if ("error" in access) return access.error;

  const job = access.job;
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sanitizedAddress = job.address
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 40);
  const folderPath = `/PhotoApp/edited/${sanitizedAddress}_${job.id.substring(0, 8)}`;

  const token = process.env.DROPBOX_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Dropbox not configured" },
      { status: 500 }
    );
  }

  // Try to create a shared link for the folder
  try {
    const response = await fetch(
      "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: folderPath,
          settings: { requested_visibility: { ".tag": "public" } },
        }),
      }
    );

    const data = await response.json();
    if (data.url) {
      return NextResponse.json({ url: data.url, folderPath });
    }

    // If link already exists, fetch it
    if (data.error?.[".tag"] === "shared_link_already_exists") {
      const linksRes = await fetch(
        "https://api.dropboxapi.com/2/sharing/list_shared_links",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: folderPath, direct_only: true }),
        }
      );
      const linksData = await linksRes.json();
      if (linksData.links?.[0]?.url) {
        return NextResponse.json({
          url: linksData.links[0].url,
          folderPath,
        });
      }
    }

    return NextResponse.json(
      { error: "Could not create shared link", details: data },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
