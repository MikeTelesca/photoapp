import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

// Editing prompts per preset
const presetPrompts: Record<string, string> = {
  standard: `Enhance this image to look like a professionally shot real estate photo with perfect, balanced lighting—bright natural window light, clean white tones, even exposure, and sharp detail throughout. Maintain the original composition, angles, and structure exactly as is.

ADDITIONAL REQUIRED EDITS:
- WINDOW PULL: Make the view through ALL windows clearly visible. Show blue sky, trees, or cityscape. No blown-out white windows.
- STRAIGHTEN all vertical lines. Fix any lens distortion. Perspective correction.
- TV SCREENS: If there's a TV, replace the screen with a beach or nature scene.
- MIRRORS: Remove any photographer reflections in mirrors or glass.
- LENS FLARES: Remove any light flares or sun spots.
- EXTERIOR SHOTS: Replace dull sky with blue sky and light clouds. Make grass lush and green.
- Keep the image photorealistic. No AI artifacts, no blur, no warping.

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
Output the edited image.`,
};

const twilightPrompt = `You are an expert real estate photo editor. Convert this daytime exterior into a STUNNING TWILIGHT/DUSK shot:

CRITICAL EDITS:
1. SKY: Replace with a beautiful twilight sky - deep blue to warm orange/pink gradient near the horizon. Stars optional.
2. INTERIOR LIGHTS: All windows should glow with warm golden/amber light from inside.
3. EXTERIOR LIGHTS: Turn on ALL exterior lighting - landscape lights, path lights, porch lights, sconces, pot lights.
4. WARM ATMOSPHERE: Overall warm, inviting mood.
5. GRASS/LANDSCAPING: Should still be visible but darker, lit by landscape lighting.
6. DRIVEWAY: Slightly wet/reflective look optional for drama.
7. Keep all architectural details sharp and clear.
8. The image should look like it was actually photographed at dusk by a professional.

Make it look STUNNING - this is the hero shot for the listing.
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
  customInstructions?: string | null
): Promise<EnhanceResult> {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        responseModalities: ["image", "text"],
      } as Record<string, unknown>,
    });

    const prompt = customInstructions
      ? `${twilightPrompt}\n\nAdditional details: ${customInstructions}`
      : twilightPrompt;

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
