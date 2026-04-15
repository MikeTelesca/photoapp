import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

// PATCH /api/templates/[id] - update a template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId, role } = authResult;

    const { id } = await params;
    const body = await request.json();

    const template = await prisma.jobTemplate.findUnique({ where: { id } });

    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (role !== "admin" && template.ownerId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Allowed fields for PATCH
    const updateData: Record<string, any> = {};
    const allowedFields = [
      "name",
      "preset",
      "tvStyle",
      "skyStyle",
      "watermarkText",
      "photographerName",
      "clientName",
      "tags",
      "notes",
      "recurrencePattern",
      "recurrenceEnabled",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const updated = await prisma.jobTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update template:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

// DELETE /api/templates/[id] - delete a template (verify ownership)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId, role } = authResult;

    const { id } = await params;

    const template = await prisma.jobTemplate.findUnique({ where: { id } });

    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (role !== "admin" && template.ownerId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.jobTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
