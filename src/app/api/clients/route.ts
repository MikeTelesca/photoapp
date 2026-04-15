import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

// GET /api/clients — list all clients for current user
export async function GET() {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId, role } = authResult;

    const where = role === "admin" ? {} : { ownerId: userId };

    const clients = await prisma.client.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        notes: true,
        defaultPreset: true,
        defaultTags: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { jobs: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    // Return empty array so pages don't crash if table doesn't exist yet
    return NextResponse.json([]);
  }
}

// POST /api/clients — create a client
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId } = authResult;

    const body = await request.json();
    const { name, email, phone, company, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        company: company?.trim() || null,
        notes: notes?.trim() || null,
        ownerId: userId,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Failed to create client:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
