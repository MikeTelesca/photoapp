import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { createFolder, createShareLinkForPath, sanitizeFolderName } from "@/lib/dropbox";
import { log } from "@/lib/logger";

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
  } catch (error: unknown) {
    log.error("jobs.list.failed", { err: errorMessage(error) });
    return NextResponse.json({ error: "Failed to fetch jobs", jobs: [] }, { status: 500 });
  }
}

// POST /api/jobs - create a new job.
// Dropbox folder provisioning is best-effort and NEVER fatal to job creation.
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId: sessionUserId, role: sessionUserRole } = authResult;

    let body: unknown;
    try {
      body = await request.json();
    } catch (err: unknown) {
      log.warn("jobs.create.invalid_json", { err: errorMessage(err) });
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const input = body as Record<string, unknown>;

    const address = typeof input.address === "string" ? input.address.trim() : "";
    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    const dropboxUrl = typeof input.dropboxUrl === "string" && input.dropboxUrl.trim() ? input.dropboxUrl.trim() : null;
    const preset = typeof input.preset === "string" && input.preset.trim() ? input.preset.trim() : "standard";
    const tvStyle = typeof input.tvStyle === "string" && input.tvStyle.trim() ? input.tvStyle.trim() : "netflix";
    const skyStyle = typeof input.skyStyle === "string" && input.skyStyle.trim() ? input.skyStyle.trim() : "blue-clouds";
    const seasonalStyle = typeof input.seasonalStyle === "string" && input.seasonalStyle.trim() ? input.seasonalStyle.trim() : null;
    const agentId = typeof input.agentId === "string" && input.agentId.trim() ? input.agentId.trim() : null;
    const photographerIdInput = typeof input.photographerId === "string" ? input.photographerId : null;

    // Photographers always get their own ID; admins can specify or fall back to themselves
    const userId: string =
      sessionUserRole === "admin" ? photographerIdInput || sessionUserId : sessionUserId;

    // Resolve agent ownership if provided. Agent lookup is scoped to the current
    // photographer unless admin. Missing agent → 400 (user can retry).
    let resolvedAgentId: string | null = null;
    let agentFolder: string | null = null;
    if (agentId) {
      try {
        const agent = await prisma.agent.findUnique({ where: { id: agentId } });
        if (!agent) {
          return NextResponse.json({ error: "Agent not found" }, { status: 400 });
        }
        if (sessionUserRole !== "admin" && agent.photographerId !== sessionUserId) {
          return NextResponse.json({ error: "Agent not accessible" }, { status: 403 });
        }
        resolvedAgentId = agent.id;
        agentFolder = agent.dropboxFolder;
      } catch (err: unknown) {
        log.warn("jobs.create.agent_lookup_failed", { agentId, err: errorMessage(err) });
        // Proceed without an agent — don't fail the whole job for a lookup blip.
      }
    }

    // If an agent has a Dropbox folder, provision a property subfolder + share link.
    // EVERY Dropbox call is wrapped individually so expired credentials, network
    // failures, or rate limits never bubble up and kill job creation.
    let resolvedDropboxUrl: string | null = dropboxUrl;
    if (agentFolder && !resolvedDropboxUrl) {
      const subPath = `${agentFolder}/${sanitizeFolderName(address)}`;
      try {
        await createFolder(subPath);
      } catch (err: unknown) {
        log.warn("jobs.create.dropbox_create_folder_failed", { subPath, err: errorMessage(err) });
      }
      try {
        resolvedDropboxUrl = await createShareLinkForPath(subPath);
      } catch (err: unknown) {
        log.warn("jobs.create.dropbox_share_failed", { subPath, err: errorMessage(err) });
      }
    }

    try {
      const job = await prisma.job.create({
        data: {
          address,
          dropboxUrl: resolvedDropboxUrl,
          preset,
          tvStyle,
          skyStyle,
          seasonalStyle,
          status: "pending",
          photographerId: userId,
          ...(resolvedAgentId ? { agentId: resolvedAgentId } : {}),
        },
        include: {
          photographer: { select: { id: true, name: true, email: true } },
          agent: { select: { id: true, name: true } },
        },
      });

      log.info("jobs.create.ok", { jobId: job.id, agentId: resolvedAgentId, preset });
      return NextResponse.json(job, { status: 201 });
    } catch (err: unknown) {
      log.error("jobs.create.prisma_failed", {
        err: errorMessage(err),
        userId,
        agentId: resolvedAgentId,
        preset,
      });
      return NextResponse.json(
        { error: `Database error creating job: ${errorMessage(err)}` },
        { status: 500 },
      );
    }
  } catch (error: unknown) {
    log.error("jobs.create.unhandled", { err: errorMessage(error) });
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}
