import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const { role } = await req.json();

    if (!role || !["admin", "photographer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'admin' or 'photographer'" },
        { status: 400 }
      );
    }

    // Prevent admin from changing their own role
    if (id === auth.userId) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 403 }
      );
    }

    // Check that user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update the role
    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}
