import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { createFolder, createShareLinkForPath, sanitizeFolderName } from "@/lib/dropbox";

// GET /api/jobs - list all jobs
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId, role } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");

    const roleFilter = role === "admin" ? {} : { photographerId: userId };
    const where = status ? { ...roleFilter, status } : roleFilter;

    const jobs = await prisma.job.findMany({
      where,
      include: {
        photographer: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    return NextResponse.json({ error: "Failed to fetch jobs", jobs: [] }, { status: 500 });
  }
}

// POST /api/jobs - create a new job.
// If an agentId is provided and the agent has a Dropbox folder, this endpoint
// will auto-create a property subfolder at `{agent.dropboxFolder}/{address}` and
// set job.dropboxUrl to the share link of that subfolder.
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId: sessionUserId, role: sessionUserRole } = authResult;

    const body = await request.json();
    const {
      address,
      dropboxUrl,
      preset,
      photographerId,
      tvStyle,
      skyStyle,
      seasonalStyle,
      agentId,
    } = body;

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    // Photographers always get their own ID; admins can specify or fall back to themselves
    const userId: string =
      sessionUserRole === "admin" ? photographerId || sessionUserId : sessionUserId;

    // Resolve agent ownership if provided
    let resolvedAgentId: string | null = null;
    let agentFolder: string | null = null;
    if (agentId && typeof agentId === "string") {
      const agent = await prisma.agent.findUnique({ where: { id: agentId } });
      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 400 });
      }
      if (sessionUserRole !== "admin" && agent.photographerId !== sessionUserId) {
        return NextResponse.json({ error: "Agent not accessible" }, { status: 403 });
      }
      resolvedAgentId = agent.id;
      agentFolder = agent.dropboxFolder;
    }

    // If an agent has a Dropbox folder, provision a property subfolder + share link.
    // Non-fatal: if Dropbox fails, still create the job with whatever dropboxUrl the
    // user typed in (which is usually null in this flow).
    let resolvedDropboxUrl: string | null = dropboxUrl || null;
    if (agentFolder && !resolvedDropboxUrl) {
      const subPath = `${agentFolder}/${sanitizeFolderName(address)}`;
      try {
        await createFolder(subPath);
        try {
          resolvedDropboxUrl = await createShareLinkForPath(subPath);
        } catch {
          // share link is optional — leaving dropboxUrl null is fine
        }
      } catch {
        // swallow — agent has a folder recorded but current creds may not reach it
      }
    }

    const job = await prisma.job.create({
      data: {
        address,
        dropboxUrl: resolvedDropboxUrl,
        preset: preset || "standard",
        tvStyle: tvStyle || "netflix",
        skyStyle: skyStyle || "blue-clouds",
        seasonalStyle: seasonalStyle || null,
        status: "pending",
        photographerId: userId,
        agentId: resolvedAgentId,
      },
      include: {
        photographer: { select: { id: true, name: true, email: true } },
        agent: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Failed to create job:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
