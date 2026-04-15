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
  // Create admin user
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

  // Create default presets with full prompts (these are the source of truth for AI editing)
  const standardPrompt = `Enhance this image to look like a professionally shot real estate photo with perfect, balanced lighting—bright natural window light, clean white tones, even exposure, and sharp detail throughout. Maintain the original composition, angles, and structure exactly as is.

ADDITIONAL REQUIRED EDITS:
- WINDOW PULL: For EXISTING windows ONLY — make the outdoor view visible through them. Show blue sky, trees, or cityscape. No blown-out white windows. IMPORTANT: Do NOT add new windows or openings where none exist. Only enhance windows that are already in the photo.
- STRAIGHTEN all vertical lines. Fix any lens distortion. Perspective correction.
- TV SCREENS: If there's a TV, replace the screen with a Netflix home screen showing movie thumbnails and the Netflix UI (red logo, rows of movie posters, dark background).
- MIRRORS: Remove any photographer reflections in mirrors or glass.
- LENS FLARES: Remove any light flares or sun spots.
- EXTERIOR SHOTS: Replace dull sky with blue sky and light clouds. Make grass lush and green.
- Keep the image photorealistic. No AI artifacts, no blur, no warping.

Output the edited image.`;

  const brightAiryPrompt = `You are an expert real estate photo editor. Create a BRIGHT AND AIRY style edit.

MANDATORY EDITS:

EXPOSURE & COLOR:
- EXTREMELY BRIGHT - increase exposure dramatically. The image should feel flooded with soft natural light.
- Warm color temperature - golden, inviting warmth.
- Lift ALL shadows completely. Zero dark areas.
- All white surfaces should glow bright, clean white.

GEOMETRY:
- STRAIGHTEN all verticals perfectly.
- PERSPECTIVE CORRECTION: Fix lens distortion, correct converging lines.
- Level the horizon.

WINDOWS (WINDOW PULL):
- Show the exterior view clearly through all windows.
- Bright sky visible, no blown-out white rectangles.

EXTERIOR SHOTS:
- SKY: Bright blue sky with soft clouds.
- GRASS: Lush, vibrant green. Remove dead patches.

OBJECT EDITS:
- TV SCREENS: Replace with lifestyle/nature scene.
- MIRRORS: Remove photographer reflections.
- LENS FLARES: Remove all.

Style reference: Restoration Hardware catalog. Light, airy, dreamy, spacious, but photorealistic.
Output the edited image.`;

  const luxuryPrompt = `You are an expert real estate photo editor. Create a LUXURY MAGAZINE style edit.

MANDATORY EDITS:

EXPOSURE & COLOR:
- Rich contrast with well-exposed interiors. Moody but inviting.
- Deep, warm shadows with golden highlights.
- Saturated but natural colors. Deep wood tones, rich fabrics, warm metallics.
- High-end editorial color grading.

GEOMETRY:
- STRAIGHTEN all verticals perfectly.
- PERSPECTIVE CORRECTION: Fix all lens distortion. Architecturally perfect lines.
- Level the horizon.

WINDOWS (WINDOW PULL):
- Show dramatic exterior view through all windows.
- Dramatic sky visible - golden hour or blue hour feel.

EXTERIOR SHOTS:
- SKY: Dramatic sky - deep blue or golden sunset tones.
- GRASS: Manicured, deep green, estate-quality landscaping.

OBJECT EDITS:
- TV SCREENS: Replace with elegant art or lifestyle scene.
- MIRRORS: Remove photographer reflections.
- LENS FLARES: Remove all.

Style reference: Architectural Digest. Premium, dramatic, aspirational, photorealistic.
Output the edited image.`;

  const mlsStandardPrompt = `You are performing REAL ESTATE PHOTO CORRECTION for MLS listings. Goal: clean, balanced, accurate representation suitable for any MLS system.

MANDATORY CORRECTIONS:
- STRAIGHTEN all vertical lines (walls, doorframes, windows, columns).
- STRAIGHTEN all horizontal lines (floor lines, ceilings, countertops).
- Fix lens distortion and barrel curve.
- Subtle perspective correction (no dramatic warping).

EDITING APPROACH:
- Conservative exposure adjustments (preserve original feel).
- Natural color reproduction — no oversaturation.
- Mild window pull (recover blown highlights without compositing fake views).
- Clean shadow detail without artificial appearance.
- Sharp focus throughout.
- Remove dust spots and minor lens artifacts.

DO NOT:
- Add fake objects, furniture, or scenery.
- Replace existing skies (preserve original sky).
- Heavily warm or cool the color cast.
- Apply dramatic HDR effects.
- Modify ceiling lines or architectural detail.

OUTPUT: 4K, sharp, MLS-ready, neutral white balance.`;

  await prisma.preset.upsert({
    where: { slug: "standard" },
    update: { promptModifiers: standardPrompt },
    create: {
      name: "Standard",
      slug: "standard",
      description: "Window-pulled HDR, natural + magazine style",
      promptModifiers: standardPrompt,
      isDefault: true,
    },
  });

  await prisma.preset.upsert({
    where: { slug: "bright-airy" },
    update: { promptModifiers: brightAiryPrompt },
    create: {
      name: "Bright & Airy",
      slug: "bright-airy",
      description: "Light, warm, lifted shadows",
      promptModifiers: brightAiryPrompt,
    },
  });

  await prisma.preset.upsert({
    where: { slug: "luxury" },
    update: { promptModifiers: luxuryPrompt },
    create: {
      name: "Luxury",
      slug: "luxury",
      description: "Rich contrast, dramatic, moody",
      promptModifiers: luxuryPrompt,
    },
  });

  await prisma.preset.upsert({
    where: { slug: "mls-standard" },
    update: { promptModifiers: mlsStandardPrompt },
    create: {
      name: "MLS Standard",
      slug: "mls-standard",
      description: "Conservative MLS-compliant editing",
      promptModifiers: mlsStandardPrompt,
    },
  });

  const flambientPrompt = `FLAMBIENT (flash + ambient hybrid) — the gold-standard real estate magazine look.
Combine ambient window light with balanced fill flash for clean, natural interiors with crisp detail throughout.

STRICT RULES:
- DO NOT add, remove, or change any physical content.
- DO NOT replace sky or fake what's visible through windows.
- Enhance grass UNIFORMLY across the entire visible lawn (front AND back), natural green, never neon.

FLAMBIENT CHARACTERISTICS:
1. WINDOW PULL: Strong window pull — exteriors visible through windows, never blown out, never HDR-halo.
2. AMBIENT BASE: Preserve the warmth of practical lights (lamps, chandeliers, pot lights). Mixed color temperature is OK and looks natural.
3. FLASH FILL: Subtle, even fill across the room — no harsh flash shadow, no flat/washed-out look. Soft, directional shadows.
4. WHITES CLEAN: Walls and trim read clean white/warm-white, never yellow or green cast.
5. COLORS NATURAL: Wood tones rich and warm, fabrics true-to-color. No oversaturation.
6. CONTRAST MEDIUM-HIGH: Editorial but not crushed. Shadow detail preserved.
7. REFLECTIVE FLOOR FIX: Polished floors often pick up blue cast from window light — neutralize to true wood/tile color.
8. WINDOW FRAMES CRISP: Detail in window muntins/frames visible against bright outside.
9. SHARPNESS: Crisp but not over-sharpened.
10. STRAIGHTEN verticals and horizontals.

OUTPUT: 4K, clean, balanced, inviting, magazine-ready.`;

  await prisma.preset.upsert({
    where: { slug: "flambient" },
    update: { promptModifiers: flambientPrompt },
    create: {
      name: "Flambient",
      slug: "flambient",
      description: "Flash + ambient hybrid, magazine-ready",
      promptModifiers: flambientPrompt,
    },
  });

  console.log("Seeded:", { admin: admin.id, presets: 5 });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
