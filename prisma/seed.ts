import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@photoapp.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@photoapp.com",
      password: "admin123", // Will be hashed in auth phase
      role: "admin",
    },
  });

  // Create default presets
  await prisma.preset.upsert({
    where: { slug: "standard" },
    update: {},
    create: {
      name: "Standard",
      slug: "standard",
      description: "Window-pulled HDR, natural + magazine style",
      promptModifiers: "Professional real estate photo. Window-pulled HDR with balanced interior and exterior exposure. Rich but natural colors. Magazine quality but true-to-life. No blown-out windows.",
      isDefault: true,
    },
  });

  await prisma.preset.upsert({
    where: { slug: "bright-airy" },
    update: {},
    create: {
      name: "Bright & Airy",
      slug: "bright-airy",
      description: "Light, warm, lifted shadows",
      promptModifiers: "Bright and airy real estate photo. Light, warm tones. Lifted shadows. Clean and spacious feel. Soft natural light.",
    },
  });

  await prisma.preset.upsert({
    where: { slug: "luxury" },
    update: {},
    create: {
      name: "Luxury",
      slug: "luxury",
      description: "Rich contrast, dramatic, moody",
      promptModifiers: "Luxury real estate photo. Rich contrast, dramatic lighting. Moody but inviting. Deep shadows, warm highlights. High-end magazine feel.",
    },
  });

  console.log("Seeded:", { admin: admin.id, presets: 3 });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
