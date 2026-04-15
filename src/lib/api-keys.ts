import crypto from "crypto";
import { prisma } from "@/lib/db";

// Generate a new API key. Returns the plaintext key (show once) AND saves hash to DB.
export async function createApiKey(opts: { userId: string; name: string }): Promise<{ key: string; id: string }> {
  const plaintext = `ath_${crypto.randomBytes(24).toString("hex")}`; // 48 char hex + prefix
  const hash = crypto.createHash("sha256").update(plaintext).digest("hex");
  const prefix = plaintext.slice(0, 12); // "ath_" + 8 hex

  const created = await prisma.apiKey.create({
    data: {
      userId: opts.userId,
      name: opts.name,
      keyHash: hash,
      keyPrefix: prefix,
    },
  });
  return { key: plaintext, id: created.id };
}

// Verify an incoming key and return the userId if valid.
export async function verifyApiKey(key: string): Promise<{ userId: string; keyId: string } | null> {
  if (!key || !key.startsWith("ath_")) return null;
  const hash = crypto.createHash("sha256").update(key).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
  if (!apiKey || apiKey.revokedAt) return null;

  // Update lastUsedAt async (fire-and-forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return { userId: apiKey.userId, keyId: apiKey.id };
}
