import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

const DEMO_ADDRESSES = [
  "1234 Oak Ridge Drive, Austin TX",
  "789 Sunset Boulevard, Los Angeles CA",
  "456 Maple Street, Portland OR",
  "99 Lakefront Lane, Chicago IL",
  "2100 Pacific Heights Way, San Francisco CA",
  "55 Brownstone Ave, Brooklyn NY",
  "1 Beach Road, Malibu CA",
  "42 Mountain View Dr, Denver CO",
];

const DEMO_CLIENTS = [
  { name: "Keller Williams Realty", email: "mike@kw.com", phone: "512-555-0101", company: "KW" },
  { name: "Coldwell Banker", email: "sara@cb.com", phone: "310-555-0102", company: "CB" },
  { name: "Remax Elite", email: "josh@remax.com", phone: "503-555-0103", company: "Remax" },
  { name: "Century 21", email: "linda@c21.com", phone: "312-555-0104", company: "C21" },
];

const PRESETS = ["standard", "bright-airy", "luxury", "custom"];
const STATUSES: Array<"review" | "approved" | "pending" | "processing"> = [
  "review",
  "approved",
  "approved",
  "approved",
  "pending",
];
const TAGS_POOL = ["urgent", "mls-ready", "reshoot", "featured", "new-listing", "price-reduction"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTags(): string {
  const count = Math.floor(Math.random() * 3);
  const tags = new Set<string>();
  for (let i = 0; i < count; i++) tags.add(pick(TAGS_POOL));
  return Array.from(tags).join(",");
}

export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const userId = auth.userId;
  let clientsCreated = 0;
  let jobsCreated = 0;

  // Create clients
  const clients = [];
  for (const c of DEMO_CLIENTS) {
    try {
      const created = await prisma.client.create({
        data: {
          name: c.name,
          email: c.email,
          phone: c.phone,
          company: c.company,
          ownerId: userId,
        },
      });
      clients.push(created);
      clientsCreated++;
    } catch (err) {
      console.error("seed client err:", err);
    }
  }

  // Create jobs with varying ages, statuses, presets
  const now = Date.now();
  for (let i = 0; i < DEMO_ADDRESSES.length; i++) {
    const address = DEMO_ADDRESSES[i];
    const daysAgo = Math.floor(Math.random() * 30);
    const totalPhotos = 30 + Math.floor(Math.random() * 40);
    const approvedPhotos = Math.floor(totalPhotos * (0.6 + Math.random() * 0.3));
    const status = pick(STATUSES);
    const preset = pick(PRESETS);
    const cost = totalPhotos * 0.07;
    const client = clients.length > 0 ? pick(clients) : null;

    try {
      await prisma.job.create({
        data: {
          address,
          clientName: client?.name || "",
          clientId: client?.id || null,
          photographerId: userId,
          preset,
          status,
          totalPhotos,
          processedPhotos: status === "pending" ? 0 : totalPhotos,
          approvedPhotos: status === "pending" ? 0 : approvedPhotos,
          rejectedPhotos: status === "pending" ? 0 : totalPhotos - approvedPhotos,
          cost,
          dropboxUrl: `https://www.dropbox.com/scl/fo/demo-${i}/demo`,
          tags: randomTags(),
          createdAt: new Date(now - daysAgo * 24 * 60 * 60 * 1000),
        },
      });
      jobsCreated++;
    } catch (err) {
      console.error("seed job err:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    clientsCreated,
    jobsCreated,
  });
}
