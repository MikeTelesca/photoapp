import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

// GET /api/templates - list all templates for current user
export async function GET() {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId } = authResult;

    const templates = await prisma.jobTemplate.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// POST /api/templates - create a template
// Body: { name, jobId? } or { name, preset, tvStyle, skyStyle, watermarkText, photographerName, clientName, tags, notes }
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;
    const { userId } = authResult;

    const body = await request.json();
    const { name, jobId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    }

    let templateData: {
      preset: string;
      tvStyle?: string | null;
      skyStyle?: string | null;
      watermarkText?: string | null;
      photographerName?: string | null;
      clientName?: string | null;
      tags?: string | null;
      notes?: string | null;
    };

    if (jobId) {
      // Copy fields from an existing job
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { photographer: { select: { name: true } } },
      });

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      // Verify ownership (admin can save any job as template)
      if (authResult.role !== "admin" && job.photographerId !== userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      templateData = {
        preset: job.preset,
        tvStyle: job.tvStyle ?? null,
        skyStyle: job.skyStyle ?? null,
        watermarkText: job.watermarkText ?? null,
        photographerName: job.photographer?.name ?? null,
        clientName: job.clientName ?? null,
        tags: job.tags || null,
        notes: job.notes ?? null,
      };
    } else {
      templateData = {
        preset: body.preset || "standard",
        tvStyle: body.tvStyle ?? null,
        skyStyle: body.skyStyle ?? null,
        watermarkText: body.watermarkText ?? null,
        photographerName: body.photographerName ?? null,
        clientName: body.clientName ?? null,
        tags: body.tags ?? null,
        notes: body.notes ?? null,
      };
    }

    const template = await prisma.jobTemplate.create({
      data: {
        name: name.trim(),
        ownerId: userId,
        ...templateData,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Failed to create template:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
