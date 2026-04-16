import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client.js";

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl?.startsWith("postgres://") || dbUrl?.startsWith("postgresql://")) {
    const { PrismaNeon } = require("@prisma/adapter-neon");
    const adapter = new PrismaNeon({ connectionString: dbUrl });
    return new PrismaClient({ adapter });
  }

  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const adapter = new PrismaBetterSqlite3({
    url: dbUrl ?? "file:./prisma/dev.db",
  });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@photoapp.com" },
    update: { password: hashedPassword },
    create: {
      name: "Admin",
      email: "admin@photoapp.com",
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("Seeded:", { admin: admin.id });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
