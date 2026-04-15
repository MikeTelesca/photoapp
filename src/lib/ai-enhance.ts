import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

// Editing prompts per preset
const presetPrompts: Record<string, string> = {
  standard: `You are performing REAL ESTATE PHOTO CORRECTION — color/exposure adjustments ONLY. This is a LISTING PHOTO that must accurately represent the actual property. Do NOT embellish reality.

STRICT RULES — DO NOT VIOLATE:
- DO NOT add, remove, or change ANY physical content in the image
- DO NOT replace the sky (even if it looks dull — keep it as-is)
- DO NOT add clouds that aren't there
- DO NOT make grass greener than it actually is
- DO NOT change what's visible through windows (no fake views, no fake scenery)
- DO NOT add, remove, or modify any buildings, landscaping, cars, or objects
- DO NOT change construction/dirt areas into grass
- DO NOT add windows, doors, or openings
- DO NOT remove walls, objects, or existing features

ONLY DO THESE SAFE ADJUSTMENTS:
1. EXPOSURE: Balance brightness — lift dark shadows, recover blown highlights. Keep it realistic, not overexposed.
2. WHITE BALANCE: Correct color casts (too yellow, too green, too cool) to neutral.
   - REFLECTIVE FLOOR FIX: Glossy/polished floors (hardwood, tile, marble) often pick up a BLUE color cast from window light and sky reflections. Detect this and neutralize it — make wood floors warm brown, make polished tile look clean white/gray, NOT blue. The floor color should match the rest of the room's lighting.
3. CONTRAST: Slight contrast boost for pop, but don't crush blacks.
4. SATURATION: Very mild saturation boost for natural-looking colors. Do not oversaturate.
5. SHARPNESS: Gentle sharpening for crisp detail.
6. NOISE: Reduce noise if visible.
7. STRAIGHTEN VERTICALS: Make all vertical lines (walls, doorframes, columns, fence posts) perfectly vertical. Fix any tilted/leaning verticals.
8. STRAIGHTEN HORIZONTALS: Level the horizon. Make countertops, ceilings, floors, and other horizontal lines perfectly straight.
9. LENS DISTORTION: Fix barrel/pincushion distortion. Correct converging vertical lines from wide-angle shots so walls appear straight up-and-down (not leaning inward at top).
10. PERSPECTIVE: Architecturally correct — rooms should look square and properly proportioned.

NOTE on #7-10: Adjust the geometry/perspective WITHOUT changing what's in the photo. Same furniture, same walls, same content — just straightened.

The goal: make the photo look like it was taken with perfect lighting and exposure. NOT like a different photo of a different place.

The output must be THE EXACT SAME SCENE — same sky, same grass, same buildings, same everything — just with better exposure and color.

Output the corrected image.`,

  "bright-airy": `You are performing REAL ESTATE PHOTO CORRECTION in a BRIGHT & AIRY style. This is a LISTING PHOTO that must accurately represent the property. Do NOT embellish reality.

STRICT RULES — DO NOT VIOLATE:
- DO NOT add, remove, or change ANY physical content
- DO NOT replace the sky, add clouds, or make grass greener than reality
- DO NOT change what's visible through windows
- DO NOT modify buildings, landscaping, or any objects
- DO NOT add or remove anything structural

ONLY DO THESE SAFE ADJUSTMENTS:
1. EXPOSURE: Push brightness higher than standard — bright, airy feel. Lift shadows fully. Do not blow out highlights.
2. WHITE BALANCE: Slightly warm neutral.
3. COLORS: Soft, gentle, slightly desaturated for a clean look.
4. WHITES: Make whites clean and bright (walls, ceilings, trim).
5. SHARPNESS: Gentle sharpening.

The output must be THE EXACT SAME SCENE — same sky, same grass, same view through windows — just lighter, airier, and cleaner.

Output the corrected image.`,

  luxury: `You are performing REAL ESTATE PHOTO CORRECTION in a LUXURY MAGAZINE style. This is a LISTING PHOTO that must accurately represent the property. Do NOT embellish reality.

STRICT RULES — DO NOT VIOLATE:
- DO NOT add, remove, or change ANY physical content
- DO NOT replace the sky, add clouds, or make grass greener than reality
- DO NOT change what's visible through windows
- DO NOT modify buildings, landscaping, or any objects
- DO NOT add or remove anything structural

ONLY DO THESE SAFE ADJUSTMENTS:
1. EXPOSURE: Balanced exposure with rich shadows. Don't crush blacks completely.
2. CONTRAST: Higher contrast for editorial feel.
3. COLORS: Rich, saturated but natural. Warm highlights, cool shadows.
4. WHITE BALANCE: Slightly warm neutral.
5. SHARPNESS: Crisp sharpening for high-end look.

The output must be THE EXACT SAME SCENE — same sky, same grass, same view through windows — just with a premium color grade.

Output the corrected image.`,
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
    // Use preset prompt, or fall back to standard
    let basePrompt = presetPrompts[preset] || presetPrompts.standard;
    let extraInstructions = customInstructions;

    if (!presetPrompts[preset] && customInstructions) {
      basePrompt = customInstructions;
      extraInstructions = null;
    }

    const prompt = extraInstructions
      ? `${basePrompt}\n\nADDITIONAL INSTRUCTIONS: ${extraInstructions}`
      : basePrompt;

    const imageBase64 = imageBuffer.toString("base64");

    // Direct API call to ensure imageConfig.imageSize is sent (SDK strips it)
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");

    const requestBody = {
      contents: [{
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: prompt },
        ],
      }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
        imageConfig: {
          imageSize: "4K",
        },
      },
    };

    // Try Nano Banana Pro (4K) first, fall back to Flash Image (2K) if overloaded
    const models = [
      { name: "gemini-3-pro-image-preview", config: { responseModalities: ["IMAGE", "TEXT"], imageConfig: { imageSize: "4K" } } },
      { name: "gemini-2.5-flash-image", config: { responseModalities: ["IMAGE", "TEXT"] } },
    ];

    let responseData: any = null;
    let lastErr: any;

    outer:
    for (const m of models) {
      const body = {
        contents: requestBody.contents,
        generationConfig: m.config,
      };

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const apiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m.name}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          );

          if (!apiResponse.ok) {
            const errText = await apiResponse.text();
            const status = apiResponse.status;
            const isRetryable = status === 503 || status === 429 || status >= 500;
            lastErr = new Error(`${m.name} ${status}: ${errText.substring(0, 200)}`);

            if (status === 503 || status === 429) {
              // Service unavailable — try fallback model
              console.log(`[gemini] ${m.name} overloaded, trying next model`);
              continue outer;
            }
            if (!isRetryable || attempt === 2) {
              throw lastErr;
            }
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }

          responseData = await apiResponse.json();
          console.log(`[gemini] Success with ${m.name}`);
          break outer;
        } catch (err: any) {
          lastErr = err;
          if (attempt === 2) continue outer;
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    if (!responseData) throw lastErr || new Error("No response");

    const candidates = responseData.candidates;
    if (!candidates || candidates.length === 0) {
      return { success: false, imageBase64: null, mimeType: "", error: "No response from Gemini" };
    }

    for (const part of candidates[0].content.parts) {
      if (part.inlineData) {
        return {
          success: true,
          imageBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png",
          error: null,
        };
      }
    }

    const textPart = candidates[0].content.parts.find((p: any) => p.text);
    return {
      success: false,
      imageBase64: null,
      mimeType: "",
      error: `Gemini returned text instead of image: ${textPart?.text?.substring(0, 200) || "unknown"}`,
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
      model: "gemini-3-pro-image-preview",
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
        imageConfig: {
          imageSize: "4K",
        },
      } as Record<string, unknown>,
    });

    const basePrompt = isExterior ? twilightExteriorPrompt : twilightInteriorPrompt;
    const prompt = customInstructions
      ? `${basePrompt}\n\nAdditional details: ${customInstructions}`
      : basePrompt;

    const imageBase64 = imageBuffer.toString("base64");

    // Retry on 503/overload errors with exponential backoff
    let result;
    let lastErr: any;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        result = await model.generateContent([
          { inlineData: { mimeType, data: imageBase64 } },
          prompt,
        ]);
        break;
      } catch (err: any) {
        lastErr = err;
        const msg = err?.message || "";
        const isRetryable = msg.includes("503") || msg.includes("overload") || msg.includes("UNAVAILABLE") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429");
        if (!isRetryable || attempt === 3) throw err;
        const waitMs = 2000 * Math.pow(2, attempt);
        console.log(`[gemini] Retryable error (attempt ${attempt + 1}/4), waiting ${waitMs}ms: ${msg.substring(0, 100)}`);
        await new Promise(r => setTimeout(r, waitMs));
      }
    }
    if (!result) throw lastErr;

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
    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" });

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
