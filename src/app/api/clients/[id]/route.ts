import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

async function getClientOrError(id: string, userId: string, role: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      jobs: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          address: true,
          status: true,
          totalPhotos: true,
          processedPhotos: true,
          cost: true,
          createdAt: true,
        },
      },
      _count: { select: { jobs: true } },
    },
  });

  if (!client) return null;
  if (role !== "admin" && client.ownerId !== userId) return null;
  return client;
}

// GET /api/clients/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId, role } = authResult;
    const { id } = await params;

    const client = await getClientOrError(id, userId, role);
    if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Failed to fetch client:", error);
    return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
  }
}

// PATCH /api/clients/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId, role } = authResult;
    const { id } = await params;

    const existing = await getClientOrError(id, userId, role);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const { name, email, phone, company, notes, defaultPreset, defaultTags } = body;

    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(company !== undefined && { company: company?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(defaultPreset !== undefined && { defaultPreset: defaultPreset || null }),
        ...(defaultTags !== undefined && { defaultTags: defaultTags || null }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update client:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

// DELETE /api/clients/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId, role } = authResult;
    const { id } = await params;

    const existing = await getClientOrError(id, userId, role);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (existing._count.jobs > 0) {
      return NextResponse.json(
        { error: `Cannot delete: this client has ${existing._count.jobs} job(s). Remove the jobs first or unlink them.` },
        { status: 409 }
      );
    }

    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete client:", error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
