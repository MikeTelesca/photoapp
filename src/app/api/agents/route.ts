import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createFolder, createShareLinkForPath, sanitizeFolderName } from "@/lib/dropbox";

const DROPBOX_ROOT = "/BatchBase";

// GET /api/agents - list the signed-in user's agents (admins see all).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "admin";
  const where = isAdmin ? {} : { photographerId: session.user.id };

  const agents = await prisma.agent.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { jobs: true } },
      photographer: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(agents);
}

// POST /api/agents - create a new agent + ensure a Dropbox folder exists for them.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const email =
    typeof input.email === "string" && input.email.trim() ? input.email.trim() : null;
  const phone =
    typeof input.phone === "string" && input.phone.trim() ? input.phone.trim() : null;
  const notes =
    typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : null;
  const skipDropbox = input.skipDropbox === true;

  // Attempt the Dropbox folder + share link. Non-fatal if it fails so the
  // user can still save the agent and retry later.
  let dropboxFolder: string | null = null;
  let dropboxShareUrl: string | null = null;

  if (!skipDropbox) {
    const folderPath = `${DROPBOX_ROOT}/${sanitizeFolderName(name)}`;
    try {
      await createFolder(DROPBOX_ROOT);
      const created = await createFolder(folderPath);
      dropboxFolder = created.path;
      try {
        dropboxShareUrl = await createShareLinkForPath(created.path);
      } catch {
        // Share link is optional; folder creation is what matters.
      }
    } catch {
      // Swallow — user probably doesn't have Dropbox configured.
    }
  }

  const agent = await prisma.agent.create({
    data: {
      name,
      email,
      phone,
      notes,
      dropboxFolder,
      dropboxShareUrl,
      photographerId: session.user.id,
    },
  });

  return NextResponse.json(agent, { status: 201 });
}
