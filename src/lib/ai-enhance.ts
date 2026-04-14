import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

// Editing prompts per preset
const presetPrompts: Record<string, string> = {
  standard: `You are a professional real estate photo editor. Edit this real estate photo with these requirements:
- Window-pulled HDR: Balance interior exposure with exterior views through windows. No blown-out windows.
- Rich but natural colors with a slight magazine quality
- Straighten any tilted verticals or horizontals
- Clean, professional look suitable for MLS listings
- If there's a TV visible, replace the screen with a lifestyle beach/nature scene
- If there's a mirror with a photographer reflection, remove the photographer
- Remove any lens flares from lights or sun
- If this is an exterior shot: enhance the sky to be blue with light clouds, enhance the grass to look green and healthy
- If there are visible power lines or trash cans, remove them
- Keep the image photorealistic — no AI artifacts, no blur, no over-processing`,

  "bright-airy": `You are a professional real estate photo editor. Edit this real estate photo with these requirements:
- Bright and airy style: light, warm tones throughout
- Lifted shadows, soft natural light feel
- Clean and spacious atmosphere
- Straighten any tilted verticals or horizontals
- If there's a TV visible, replace the screen with a lifestyle scene
- If there's a mirror with a photographer reflection, remove the photographer
- Remove any lens flares
- If exterior: bright blue sky, lush green grass
- Keep photorealistic — no AI artifacts`,

  luxury: `You are a professional real estate photo editor. Edit this real estate photo with these requirements:
- Luxury magazine style: rich contrast, dramatic but inviting lighting
- Deep shadows with warm highlights
- High-end editorial feel
- Straighten any tilted verticals or horizontals
- If there's a TV visible, replace the screen with an elegant scene
- If there's a mirror with a photographer reflection, remove the photographer
- Remove any lens flares
- If exterior: dramatic sky, manicured-looking grass
- Keep photorealistic — no AI artifacts`,
};

const twilightPrompt = `You are a professional real estate photo editor. Convert this daytime exterior photo into a stunning twilight/dusk shot:
- Sky should transition from deep blue to warm orange/pink near the horizon
- All interior lights should be glowing warmly through windows
- Exterior landscape lighting should be on (path lights, garden lights)
- The overall mood should be warm and inviting
- Keep the image photorealistic
- Maintain all architectural details`;

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

    const prompt = customInstructions
      ? `${presetPrompts[preset] || presetPrompts.standard}\n\nAdditional instructions: ${customInstructions}`
      : presetPrompts[preset] || presetPrompts.standard;

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
