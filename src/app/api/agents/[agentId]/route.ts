import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function loadOwnedAgent(agentId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const isAdmin = session.user.role === "admin";
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (!isAdmin && agent.photographerId !== session.user.id) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { agent };
}

// GET /api/agents/:agentId
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const access = await loadOwnedAgent(agentId);
  if ("error" in access) return access.error;
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      _count: { select: { jobs: true } },
      photographer: { select: { name: true, email: true } },
    },
  });
  return NextResponse.json(agent);
}

// PATCH /api/agents/:agentId
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const access = await loadOwnedAgent(agentId);
  if ("error" in access) return access.error;

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
  const data: Record<string, string | null> = {};

  if (typeof input.name === "string") {
    const trimmed = input.name.trim();
    if (!trimmed) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    data.name = trimmed;
  }
  if ("email" in input) data.email = typeof input.email === "string" && input.email.trim() ? input.email.trim() : null;
  if ("phone" in input) data.phone = typeof input.phone === "string" && input.phone.trim() ? input.phone.trim() : null;
  if ("notes" in input) data.notes = typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : null;

  const updated = await prisma.agent.update({ where: { id: agentId }, data });
  return NextResponse.json(updated);
}

// DELETE /api/agents/:agentId
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const access = await loadOwnedAgent(agentId);
  if ("error" in access) return access.error;
  // Jobs with this agentId are set to null via schema onDelete: SetNull.
  await prisma.agent.delete({ where: { id: agentId } });
  return NextResponse.json({ ok: true });
}
