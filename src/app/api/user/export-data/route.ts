import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const userId = auth.userId;

  // Pull everything owned by user
  const [user, jobs, clients, presets, templates] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        businessName: true,
        businessEmail: true,
        businessPhone: true,
        businessAddress: true,
        invoiceRate: true,
        invoicePrefix: true,
        emailNotifications: true,
        slackWebhookUrl: true,
      },
    }),
    prisma.job
      .findMany({
        where: { photographerId: userId },
        include: { photos: true },
      })
      .catch(() => []),
    prisma.client.findMany({ where: { ownerId: userId } }).catch(() => []),
    prisma.preset.findMany({}).catch(() => []), // Global presets, not user-owned
    prisma.jobTemplate.findMany({ where: { ownerId: userId } }).catch(() => []),
  ]);

  const data = {
    app: "ath-editor",
    version: 1,
    exportedAt: new Date().toISOString(),
    user,
    counts: {
      jobs: jobs.length,
      clients: clients.length,
      presets: presets.length,
      templates: templates.length,
      photos: jobs.reduce((s, j) => s + (j.photos?.length || 0), 0),
    },
    jobs,
    clients,
    presets,
    templates,
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="ath-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
