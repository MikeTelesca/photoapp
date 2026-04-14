import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

// Editing prompts per preset
const presetPrompts: Record<string, string> = {
  standard: `Enhance this image to look like a professionally shot real estate photo with perfect, balanced lighting—bright natural window light, clean white tones, even exposure, and sharp detail throughout. Maintain the original composition, angles, and structure exactly as is.

ADDITIONAL REQUIRED EDITS:
- WINDOW PULL: ONLY for windows that ALREADY EXIST in the original photo — make the outdoor view visible through them. CRITICAL: Do NOT create, add, or hallucinate new windows, openings, or views where none exist in the original photo. If a wall is solid, keep it solid. Only enhance windows you can clearly see in the original image.
- STRAIGHTEN all vertical lines. Fix any lens distortion. Perspective correction.
- TV SCREENS: Handle according to the TV style instructions provided below.
- MIRRORS: Remove any photographer reflections in mirrors or glass.
- LENS FLARES: Remove any light flares or sun spots.
- EXTERIOR SHOTS: Handle sky according to the sky style instructions provided below. Make grass lush and green.
- Keep the image photorealistic. No AI artifacts, no blur, no warping.

CRITICAL RULES:
- NEVER add windows, doors, or openings that don't exist in the original photo.
- NEVER change the room layout or architecture.
- NEVER add or remove walls, furniture, or structural elements.
- Maintain the EXACT same composition and structure as the original.

Output the edited image.`,

  "bright-airy": `You are an expert real estate photo editor. Create a BRIGHT AND AIRY style edit.

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
- ONLY for windows that ALREADY EXIST in the original photo — make the outdoor view visible through them. CRITICAL: Do NOT create, add, or hallucinate new windows, openings, or views where none exist in the original photo. If a wall is solid, keep it solid. Only enhance windows you can clearly see in the original image.
- Bright sky visible, no blown-out white rectangles.

EXTERIOR SHOTS:
- SKY: Handle according to the sky style instructions provided below.
- GRASS: Lush, vibrant green. Remove dead patches.

OBJECT EDITS:
- TV SCREENS: Handle according to the TV style instructions provided below.
- MIRRORS: Remove photographer reflections.
- LENS FLARES: Remove all.

CRITICAL RULES:
- NEVER add windows, doors, or openings that don't exist in the original photo.
- NEVER change the room layout or architecture.
- NEVER add or remove walls, furniture, or structural elements.
- Maintain the EXACT same composition and structure as the original.

Style reference: Restoration Hardware catalog. Light, airy, dreamy, spacious, but photorealistic.
Output the edited image.`,

  luxury: `You are an expert real estate photo editor. Create a LUXURY MAGAZINE style edit.

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
- ONLY for windows that ALREADY EXIST in the original photo — make the outdoor view visible through them. CRITICAL: Do NOT create, add, or hallucinate new windows, openings, or views where none exist in the original photo. If a wall is solid, keep it solid. Only enhance windows you can clearly see in the original image.
- Dramatic sky visible - golden hour or blue hour feel.

EXTERIOR SHOTS:
- SKY: Handle according to the sky style instructions provided below.
- GRASS: Manicured, deep green, estate-quality landscaping.

OBJECT EDITS:
- TV SCREENS: Handle according to the TV style instructions provided below.
- MIRRORS: Remove photographer reflections.
- LENS FLARES: Remove all.

CRITICAL RULES:
- NEVER add windows, doors, or openings that don't exist in the original photo.
- NEVER change the room layout or architecture.
- NEVER add or remove walls, furniture, or structural elements.
- Maintain the EXACT same composition and structure as the original.

Style reference: Architectural Digest. Premium, dramatic, aspirational, photorealistic.
Output the edited image.`,
};

const twilightExteriorPrompt = `Convert this daytime EXTERIOR photo into a stunning twilight/dusk shot:

- SKY: Beautiful twilight sky — deep blue to warm orange/pink gradient near the horizon.
- INTERIOR LIGHTS: All windows should glow with warm golden/amber light from inside.
- EXTERIOR LIGHTS: Turn on ALL exterior lighting — landscape lights, path lights, porch lights, sconces, pot lights.
- WARM ATMOSPHERE: Overall warm, inviting evening mood.
- Keep all architectural details sharp and clear.
- The image should look like it was photographed at dusk by a professional.
- CRITICAL: Do NOT change the house or property. Keep the EXACT same building, architecture, and composition.

Output the edited image.`;

const twilightInteriorPrompt = `Convert this daytime INTERIOR photo into an evening/night ambiance shot:

- LIGHTING: Create warm, cozy evening lighting — table lamps glowing, pendant lights on, warm ambient light throughout.
- WINDOWS: Through any windows, show a dark blue twilight/evening sky. The exterior should look like dusk or nighttime.
- MOOD: Warm, inviting, cozy evening atmosphere. Like the lights are on in the evening.
- KEEP the exact same room, furniture, layout, and composition. Do NOT change the interior design.
- Do NOT turn this into an exterior shot. This is an INTERIOR photo — keep it as an interior.
- Keep the image photorealistic.

Output the edited image.`;

export interface EnhanceResult {
  success: boolean;
  imageBase64: string | null;
  mimeType: string;
  error: string | null;
}

/**
 * Enhance a real estate photo using Gemini's image editing.
 */
export async function enhancePhoto(
  imageBuffer: Buffer,
  mimeType: string,
  preset: string,
  customInstructions?: string | null
): Promise<EnhanceResult> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        responseModalities: ["image", "text"],
      } as Record<string, unknown>,
    });

    // Use preset prompt, or fall back to standard
    let basePrompt = presetPrompts[preset] || presetPrompts.standard;
    let extraInstructions = customInstructions;

    // If it's a custom preset not in our hardcoded list, use the custom instructions as the base
    if (!presetPrompts[preset] && customInstructions) {
      basePrompt = customInstructions;
      extraInstructions = null; // Don't append it twice
    }

    const prompt = extraInstructions
      ? `${basePrompt}\n\nADDITIONAL INSTRUCTIONS: ${extraInstructions}`
      : basePrompt;

    const imageBase64 = imageBuffer.toString("base64");

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      },
      prompt,
    ]);

    const response = result.response;
    const candidates = response.candidates;

    if (!candidates || candidates.length === 0) {
      return { success: false, imageBase64: null, mimeType: "", error: "No response from Gemini" };
    }

    // Look for image parts in the response
    for (const part of candidates[0].content.parts) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const partAny = part as any;
      if (partAny.inlineData) {
        return {
          success: true,
          imageBase64: partAny.inlineData.data as string,
          mimeType: (partAny.inlineData.mimeType as string) || "image/png",
          error: null,
        };
      }
    }

    // No image in response — might have returned text only
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textPart = candidates[0].content.parts.find((p: any) => p.text);
    return {
      success: false,
      imageBase64: null,
      mimeType: "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error: `Gemini returned text instead of image: ${(textPart as any)?.text?.substring(0, 200) || "unknown"}`,
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Gemini enhance error:", err);
    return {
      success: false,
      imageBase64: null,
      mimeType: "",
      error: err.message || "Enhancement failed",
    };
  }
}

/**
 * Convert a daytime exterior to twilight.
 */
export async function convertToTwilight(
  imageBuffer: Buffer,
  mimeType: string,
  isExterior: boolean,
  customInstructions?: string | null
): Promise<EnhanceResult> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        responseModalities: ["image", "text"],
      } as Record<string, unknown>,
    });

    const basePrompt = isExterior ? twilightExteriorPrompt : twilightInteriorPrompt;
    const prompt = customInstructions
      ? `${basePrompt}\n\nAdditional details: ${customInstructions}`
      : basePrompt;

    const imageBase64 = imageBuffer.toString("base64");

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      },
      prompt,
    ]);

    const response = result.response;
    const candidates = response.candidates;

    if (!candidates || candidates.length === 0) {
      return { success: false, imageBase64: null, mimeType: "", error: "No response" };
    }

    for (const part of candidates[0].content.parts) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const partAny = part as any;
      if (partAny.inlineData) {
        return {
          success: true,
          imageBase64: partAny.inlineData.data as string,
          mimeType: (partAny.inlineData.mimeType as string) || "image/png",
          error: null,
        };
      }
    }

    return { success: false, imageBase64: null, mimeType: "", error: "No image in response" };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, imageBase64: null, mimeType: "", error: err.message };
  }
}

/**
 * Analyze a photo to detect if it's interior/exterior and what edits are needed.
 */
export async function analyzePhoto(
  imageBuffer: Buffer,
  mimeType: string
): Promise<{
  isExterior: boolean;
  detections: string[];
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBuffer.toString("base64"),
        },
      },
      `Analyze this real estate photo. Respond ONLY with a JSON object (no markdown, no code blocks):
{
  "isExterior": true/false,
  "hasTV": true/false,
  "hasMirrorReflection": true/false,
  "hasSky": true/false,
  "hasGrass": true/false,
  "hasLensFlare": true/false,
  "hasPhotographerReflection": true/false
}`,
    ]);

    const text = result.response.text();
    // Try to parse JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { isExterior: false, detections: [] };
    }

    const analysis = JSON.parse(jsonMatch[0]);
    const detections: string[] = [];

    if (analysis.hasTV) detections.push("tv_detected");
    if (analysis.hasMirrorReflection || analysis.hasPhotographerReflection) detections.push("reflection_detected");
    if (analysis.hasSky) detections.push("sky_detected");
    if (analysis.hasGrass) detections.push("grass_detected");
    if (analysis.hasLensFlare) detections.push("flare_detected");

    return {
      isExterior: analysis.isExterior || false,
      detections,
    };
  } catch (error) {
    console.error("Photo analysis error:", error);
    return { isExterior: false, detections: [] };
  }
}
