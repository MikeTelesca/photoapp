import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

// Editing prompts per preset
const presetPrompts: Record<string, string> = {
  standard: `You are an expert real estate photo editor. DRAMATICALLY improve this photo for an MLS listing:

CRITICAL EDITS (do ALL of these):
1. BRIGHTEN THE ENTIRE IMAGE SIGNIFICANTLY - make it look light, airy, and inviting. Real estate photos should be MUCH brighter than normal photos.
2. WINDOWS: Make the view through ALL windows clearly visible. Pull the exterior view - show blue sky, trees, buildings. NO blown-out white windows.
3. WHITE BALANCE: Correct to neutral/warm. Remove any yellow/green color casts.
4. SHADOWS: Lift all shadows dramatically. No dark corners or underexposed areas.
5. COLORS: Make colors rich and vibrant but natural. Wood floors should look warm, whites should be bright white.
6. STRAIGHTEN: Fix any tilted verticals or horizontals.
7. TV SCREENS: If there's a TV, replace the screen with a beach/nature scene.
8. MIRRORS: If you see a photographer's reflection in any mirror or glass, remove them completely.
9. LENS FLARES: Remove any light flares or sun spots.
10. CLEAN UP: Remove any clutter, personal items, or distracting objects if possible.

The final image should look like it belongs in a luxury real estate magazine. BRIGHT, CLEAN, PROFESSIONAL.
Output the edited image.`,

  "bright-airy": `You are an expert real estate photo editor. Create a BRIGHT AND AIRY look:

CRITICAL EDITS:
1. EXTREMELY BRIGHT - push brightness way up. The image should feel flooded with natural light.
2. WARM TONES - slight warm color temperature, golden light feel.
3. LIFTED SHADOWS - no shadows at all, everything should be visible and light.
4. WINDOWS: Show the view clearly, bright sky visible.
5. WHITE BALANCE: Warm and clean.
6. WHITES: All white surfaces should glow bright white.
7. TV SCREENS: Replace with lifestyle scene.
8. MIRRORS: Remove photographer reflections.
9. LENS FLARES: Remove.
10. Make it feel spacious, clean, and magazine-quality.

Think: Restoration Hardware catalog. Light, airy, dreamy, but still realistic.
Output the edited image.`,

  luxury: `You are an expert real estate photo editor. Create a LUXURY MAGAZINE look:

CRITICAL EDITS:
1. DRAMATIC LIGHTING - rich contrast but still well-exposed. Deep, moody shadows with warm highlights.
2. RICH COLORS - saturated but natural. Deep wood tones, rich fabrics, warm metals.
3. WINDOWS: Show exterior view clearly with dramatic sky.
4. HIGH-END FEEL - make the space look like a luxury hotel or high-end condo.
5. WARM HIGHLIGHTS - golden hour warmth in the highlights.
6. TV SCREENS: Replace with elegant scene.
7. MIRRORS: Remove photographer reflections.
8. LENS FLARES: Remove.
9. STRAIGHTEN all verticals.
10. CLEAN UP any clutter.

Think: Architectural Digest. Rich, dramatic, inviting, premium.
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
