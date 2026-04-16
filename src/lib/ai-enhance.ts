import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkPromptSafety } from "./prompt-safety";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

// Editing prompts per preset
const presetPrompts: Record<string, string> = {
  standard: `You are performing REAL ESTATE PHOTO CORRECTION — color/exposure adjustments ONLY. This is a LISTING PHOTO that must accurately represent the actual property. Do NOT embellish reality.

STRICT RULES — DO NOT VIOLATE:
- DO NOT add, remove, or change ANY physical content in the image
- DO NOT replace the sky (even if it looks dull — keep it as-is)
- DO NOT add clouds that aren't there
- Enhance grass UNIFORMLY across the entire visible lawn (front AND back, foreground AND background). Healthy, natural green — never neon. If one patch of grass looks greener than another purely due to shadow or exposure, even them out. Do not hallucinate grass where there isn't any.
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

REFLECTION AND PERSON CLEANUP (CRITICAL — do this even if not asked):
- Remove any person, photographer, camera, tripod, light stand, or crew member visible in the photo.
- Remove photographer reflections from mirrors, windows, picture frames, glass doors, shiny appliances, polished floors, glossy countertops, faucets, and any other reflective surface.
- Preserve the reflection itself — just replace the photographer/gear with the surrounding scene (clean wall, continuation of view, etc.). Mirrors should still read as mirrors.
- Do NOT hallucinate new objects, text, signage, or content. Only remove, and fill in with plausible existing scene context.
- Windows that reflect the photographer should show the expected exterior view OR a clean darker window with no person.

The goal: make the photo look like it was taken with perfect lighting and exposure. NOT like a different photo of a different place.

The output must be THE EXACT SAME SCENE — same sky, same grass, same buildings, same everything — just with better exposure and color.

Output the corrected image.`,

  "bright-airy": `You are performing REAL ESTATE PHOTO CORRECTION in a BRIGHT & AIRY style. This is a LISTING PHOTO that must accurately represent the property. Do NOT embellish reality.

STRICT RULES — DO NOT VIOLATE:
- DO NOT add, remove, or change ANY physical content
- DO NOT replace the sky or add clouds that aren't there
- Enhance grass UNIFORMLY across the entire visible lawn (front AND back). Natural green, never neon. Do not hallucinate grass where there is dirt or stone.
- DO NOT change what's visible through windows
- DO NOT modify buildings, landscaping, or any objects
- DO NOT add or remove anything structural

ONLY DO THESE SAFE ADJUSTMENTS:
1. EXPOSURE: Push brightness higher than standard — bright, airy feel. Lift shadows fully. Do not blow out highlights.
2. WHITE BALANCE: Slightly warm neutral.
3. COLORS: Soft, gentle, slightly desaturated for a clean look.
4. WHITES: Make whites clean and bright (walls, ceilings, trim).
5. SHARPNESS: Gentle sharpening.

REFLECTION AND PERSON CLEANUP (CRITICAL — do this even if not asked):
- Remove any person, photographer, camera, tripod, light stand, or crew member visible in the photo.
- Remove photographer reflections from mirrors, windows, picture frames, glass doors, shiny appliances, polished floors, glossy countertops, faucets, and any other reflective surface.
- Preserve the reflection itself — just replace the photographer/gear with the surrounding scene (clean wall, continuation of view, etc.). Mirrors should still read as mirrors.
- Do NOT hallucinate new objects, text, signage, or content. Only remove, and fill in with plausible existing scene context.
- Windows that reflect the photographer should show the expected exterior view OR a clean darker window with no person.

The output must be THE EXACT SAME SCENE — same sky, same grass, same view through windows — just lighter, airier, and cleaner.

Output the corrected image.`,

  "flambient-hdr": `You are performing REAL ESTATE PHOTO CORRECTION in FLAMBIENT HDR style — the flash+ambient blend real estate shooters bracket for. This is a LISTING PHOTO that must accurately represent the property. Do NOT embellish reality.

STRICT RULES — DO NOT VIOLATE:
- DO NOT add, remove, or change ANY physical content
- DO NOT replace the sky or add clouds that aren't there
- Enhance grass UNIFORMLY across the entire visible lawn (front AND back). Natural green, never neon. Do not hallucinate grass where there is dirt or stone.
- DO NOT change what's visible through windows
- DO NOT modify buildings, landscaping, or any objects

FLAMBIENT HDR CHARACTERISTICS:
1. FLASH + AMBIENT BLEND: Look like ambient room light with soft directional fill flash. Shadows soft but present, never flat.
2. WINDOW PULL: Strong HDR window pull — exteriors visible through windows, fully detailed, NEVER blown out. No halo artifacts.
3. SHADOW LIFT: Lift shadows fully so every corner is readable; preserve micro-contrast, don't wash out.
4. HIGHLIGHT CONTROL: Recover blown ceilings, lampshades, window trims. Skies pulled from windows but still natural blue/grey, not surreal.
5. TV SCREENS: Natural skin tones and correct color in anything showing on TV screens. No green/magenta shifts.
6. WHITE BALANCE: Mixed-temperature interiors stay believable — warm practicals (lamps, pots) stay warm; walls and trim read clean neutral white (never yellow, green, or blue cast).
7. REFLECTIVE FLOORS: Wood floors warm brown, polished tile clean neutral — never blue-cast from sky reflections.
8. CONTRAST: Medium-high editorial contrast. Deep blacks without crushing detail. Bright whites without clipping.
9. SHARPNESS: Crisp but never over-sharpened. Window muntins visible against bright exteriors.
10. STRAIGHTEN verticals + horizontals; correct wide-angle lens distortion.

REFLECTION AND PERSON CLEANUP (CRITICAL — do this even if not asked):
- Remove any person, photographer, camera, tripod, light stand, or crew member visible in the photo.
- Remove photographer reflections from mirrors, windows, picture frames, glass doors, shiny appliances, polished floors, glossy countertops, faucets, and any other reflective surface.
- Preserve the reflection itself — just replace the photographer/gear with the surrounding scene (clean wall, continuation of view, etc.). Mirrors should still read as mirrors.
- Do NOT hallucinate new objects, text, signage, or content. Only remove, and fill in with plausible existing scene context.
- Windows that reflect the photographer should show the expected exterior view OR a clean darker window with no person.

The look: magazine-ready, what a pro flambient shooter would composite in Photoshop from 5-9 brackets + flash. Clean, balanced, inviting.

The output must be THE EXACT SAME SCENE — same sky, same grass, same view through windows — just with the flambient HDR light balance applied.

Output the corrected image.`,

  "mls-standard": `You are performing REAL ESTATE PHOTO CORRECTION for MLS listings. Goal: clean, balanced, accurate representation suitable for any MLS system. This is a LISTING PHOTO that must accurately represent the property. Do NOT embellish reality.

STRICT RULES — DO NOT VIOLATE:
- DO NOT add, remove, or change ANY physical content
- DO NOT replace the sky or add clouds that aren't there
- Enhance grass UNIFORMLY across the entire visible lawn (front AND back). Natural green, never neon. Do not hallucinate grass where there is dirt or stone.
- DO NOT change what's visible through windows
- DO NOT modify buildings, landscaping, or any objects
- DO NOT add or remove anything structural

MANDATORY CORRECTIONS:
1. STRAIGHTEN all vertical lines (walls, doorframes, windows, columns) perfectly.
2. STRAIGHTEN all horizontal lines (floor lines, ceilings, countertops).
3. Fix lens distortion and barrel curve.
4. Subtle perspective correction (no dramatic warping).

EDITING APPROACH:
5. Conservative exposure adjustments (preserve original feel).
6. Natural color reproduction — no oversaturation.
7. Mild window pull (recover blown highlights without compositing fake views).
8. Clean shadow detail without artificial appearance.
9. Sharp focus throughout.
10. Remove dust spots and minor lens artifacts.

The output must be THE EXACT SAME SCENE — same sky, same grass, same objects — just straightened, corrected, and ready for MLS.

Output the corrected image.`,

  flambient: `You are performing REAL ESTATE PHOTO CORRECTION in a FLAMBIENT (flash + ambient hybrid) style — the gold-standard magazine look. Combine ambient window light with balanced fill flash for clean, natural interiors with crisp detail throughout. This is a LISTING PHOTO that must accurately represent the property. Do NOT embellish reality.

STRICT RULES — DO NOT VIOLATE:
- DO NOT add, remove, or change ANY physical content
- DO NOT replace the sky, add clouds, or fake what's visible through windows
- Enhance grass UNIFORMLY across the entire visible lawn (front AND back). Natural green, never neon.
- DO NOT modify buildings, landscaping, furniture, or any objects
- DO NOT add or remove anything structural

FLAMBIENT CHARACTERISTICS:
1. WINDOW PULL: Strong window pull so exteriors through windows are visible (never blown out), but natural — not HDR-halo.
2. AMBIENT BASE: Preserve the warmth of practical lights (lamps, chandeliers, pot lights). Mixed color temp is OK and looks human.
3. FLASH FILL: Subtle, even fill across the room — no harsh flash shadow, no flat/washed-out look. Shadows stay soft and directional.
4. WHITES CLEAN: Walls and trim should read clean white/warm-white, NOT yellow or green cast.
5. COLORS NATURAL: Wood tones rich and warm, fabrics true-to-color. No oversaturation.
6. CONTRAST MEDIUM-HIGH: Editorial but not crushed. Shadow detail preserved.
7. REFLECTIVE FLOOR FIX: Polished floors often pick up blue cast from window light — neutralize to true wood/tile color.
8. WINDOW FRAMES CRISP: Detail in window muntins/frames visible against bright outside.
9. SHARPNESS: Crisp but not over-sharpened.
10. STRAIGHTEN verticals and horizontals (walls, counters, ceilings, doorframes).

The look: like a pro used off-camera flash bounced into ambient, then finished in Lightroom. Clean, balanced, inviting, magazine-ready.

The output must be THE EXACT SAME SCENE — same sky, same grass, same everything — just with flambient lighting balance.

Output the corrected image.`,
};

const twilightExteriorPrompts: Record<string, string> = {
  "warm-dusk": `Convert this daytime EXTERIOR photo into a stunning warm dusk shot:
- SKY: Beautiful warm dusk sky — orange/pink/coral gradient near the horizon transitioning to deep blue above. Think golden hour just after sunset.
- INTERIOR LIGHTS: All windows glow with WARM golden/amber light from inside.
- EXTERIOR LIGHTS: Turn on ALL exterior lighting — landscape lights, path lights, porch lights, sconces, pot lights — warm tone.
- WARM ATMOSPHERE: Inviting, golden-hour evening mood.
- Keep all architectural details sharp and clear.
- CRITICAL: Do NOT change the house, property, landscaping. Same building, same composition.

Output the edited image.`,

  "blue-hour": `Convert this daytime EXTERIOR photo into a stunning BLUE HOUR twilight shot:
- SKY: Deep cobalt blue sky — that magical 20-minute window after sunset where everything glows blue. Stars optional.
- INTERIOR LIGHTS: Windows glow with warm WHITE light, contrasting beautifully against the cool blue sky.
- EXTERIOR LIGHTS: All landscape, path, porch lights ON in warm white.
- COOL/WARM CONTRAST: The classic blue hour real estate look — cool sky, warm interior glow.
- Keep all architectural details sharp and clear.
- CRITICAL: Do NOT change the house, property, landscaping. Same building, same composition.

Output the edited image.`,

  "deep-night": `Convert this daytime EXTERIOR photo into a deep night shot:
- SKY: Dark navy/black night sky with subtle star detail.
- INTERIOR LIGHTS: All windows brightly lit with warm interior light.
- EXTERIOR LIGHTS: All landscape lighting, path lights, porch lights, sconces clearly visible. The lighting should be the focal point.
- DRAMATIC: Show off the property's exterior lighting design at full effect.
- Keep all architectural details sharp and clear.
- CRITICAL: Do NOT change the house, property, landscaping. Same building, same composition.

Output the edited image.`,
};

const twilightInteriorPrompts: Record<string, string> = {
  "warm-dusk": `Convert this daytime INTERIOR photo into a warm evening ambiance:
- LIGHTING: Warm, cozy evening light — table lamps glowing, pendant lights on, warm ambient throughout.
- WINDOWS: Through any windows, show a dusky orange/pink sky.
- MOOD: Warm, inviting, cozy evening atmosphere.
- KEEP the exact same room, furniture, layout. Do NOT change the interior design.
- Do NOT turn this into an exterior shot.

Output the edited image.`,

  "blue-hour": `Convert this daytime INTERIOR photo into a blue hour interior:
- LIGHTING: Warm interior lights ON (lamps, pendants), creating warm glow against cool window light.
- WINDOWS: Show deep blue twilight sky outside.
- MOOD: Magical blue hour with warm interior contrast.
- KEEP same room, furniture, layout. INTERIOR shot.

Output the edited image.`,

  "deep-night": `Convert this daytime INTERIOR photo into a night interior:
- LIGHTING: All interior lights ON, warm and inviting.
- WINDOWS: Show dark night sky outside.
- MOOD: Cozy nighttime room with all lights on.
- KEEP same room, furniture, layout. INTERIOR shot.

Output the edited image.`,
};

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
  imageInput: Buffer | Buffer[],
  mimeType: string,
  preset: string,
  customInstructions?: string | null,
  seasonalStyle?: string | null,
  userPromptPrefix?: string | null,
  // Optional lookup for user-defined preset prompts (keyed by slug). When the
  // caller's `preset` string doesn't match a built-in, we try this map before
  // falling back to `customInstructions` or standard.
  customPresetPrompt?: string | null,
): Promise<EnhanceResult> {
  try {
    // Check custom instructions safety
    if (customInstructions) {
      const customSafety = checkPromptSafety(customInstructions);
      if (!customSafety.safe) {
        return {
          success: false,
          error: `Custom instructions blocked: ${customSafety.reason}`,
          imageBase64: "",
          mimeType: "",
        };
      }
    }

    // Check user prompt prefix safety
    if (userPromptPrefix) {
      const prefixSafety = checkPromptSafety(userPromptPrefix);
      if (!prefixSafety.safe) {
        return {
          success: false,
          error: `Prompt prefix blocked: ${prefixSafety.reason}`,
          imageBase64: "",
          mimeType: "",
        };
      }
    }

    // Prefer built-in preset prompt → user preset prompt → customInstructions-as-prompt → standard fallback
    let basePrompt: string;
    let extraInstructions: string | null | undefined = customInstructions;

    if (presetPrompts[preset]) {
      basePrompt = presetPrompts[preset];
    } else if (customPresetPrompt && customPresetPrompt.trim()) {
      basePrompt = customPresetPrompt.trim();
    } else if (customInstructions && customInstructions.trim()) {
      basePrompt = customInstructions;
      extraInstructions = null;
    } else {
      basePrompt = presetPrompts.standard;
    }

    let prompt = extraInstructions
      ? `${basePrompt}\n\nADDITIONAL INSTRUCTIONS: ${extraInstructions}`
      : basePrompt;

    // Prepend user's custom prompt prefix if provided
    if (userPromptPrefix && userPromptPrefix.trim()) {
      prompt = `USER STYLE GUIDE (apply consistently across all photos):\n${userPromptPrefix.trim()}\n\n${prompt}`;
    }

    // Append seasonal style modifier if provided
    if (seasonalStyle && seasonalStyle.trim()) {
      prompt = `${prompt}\n\nSEASONAL STYLE: ${seasonalStyle.trim()}`;
    }

    // Final safety check on the complete prompt
    const fullSafety = checkPromptSafety(prompt);
    if (!fullSafety.safe) {
      console.warn("[ai-enhance] blocked unsafe prompt:", fullSafety.reason);
      return {
        success: false,
        error: `Prompt blocked: ${fullSafety.reason}`,
        imageBase64: "",
        mimeType: "",
      };
    }

    // Support single image or array of brackets (for HDR merge)
    const imageBuffers = Array.isArray(imageInput) ? imageInput : [imageInput];
    const imageParts = imageBuffers.map((buf) => ({
      inlineData: { mimeType, data: buf.toString("base64") },
    }));

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");

    const requestBody = {
      contents: [{
        parts: [
          ...imageParts,
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

    // Cascade through models, preferring 4K-capable ones first
    const models = [
      { name: "gemini-3-pro-image-preview", config: { responseModalities: ["IMAGE", "TEXT"], imageConfig: { imageSize: "4K" } } },
      { name: "gemini-3.1-flash-image-preview", config: { responseModalities: ["IMAGE", "TEXT"], imageConfig: { imageSize: "4K" } } },
      { name: "gemini-3.1-flash-image-preview", config: { responseModalities: ["IMAGE", "TEXT"], imageConfig: { imageSize: "2K" } } },
      { name: "gemini-2.5-flash-image", config: { responseModalities: ["IMAGE", "TEXT"] } },
    ];

    let responseData: any = null;
    let lastErr: any;

    // Fail-fast cascade: try each model once, immediately fall through on any failure
    for (const m of models) {
      const body = {
        contents: requestBody.contents,
        generationConfig: m.config,
      };

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
          lastErr = new Error(`${m.name} ${apiResponse.status}: ${errText.substring(0, 200)}`);
          console.log(`[gemini] ${m.name} ${apiResponse.status}, trying next model`);
          continue;
        }

        responseData = await apiResponse.json();
        // Verify response has an image (sometimes 200 but no image)
        const hasImage = responseData?.candidates?.[0]?.content?.parts?.some((p: any) => p.inlineData);
        if (!hasImage) {
          lastErr = new Error(`${m.name} returned no image`);
          console.log(`[gemini] ${m.name} returned no image, trying next`);
          responseData = null;
          continue;
        }

        console.log(`[gemini] Success with ${m.name}`);
        break;
      } catch (err: any) {
        lastErr = err;
        console.log(`[gemini] ${m.name} threw error, trying next: ${err?.message?.substring(0, 100)}`);
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
 * Convert a daytime exterior/interior to twilight with style variants.
 * Uses the same model cascade as enhancePhoto for reliability.
 */
export async function convertToTwilight(
  imageInput: Buffer | Buffer[],
  mimeType: string,
  isExterior: boolean,
  customInstructions?: string | null,
  style: string = "warm-dusk"
): Promise<EnhanceResult> {
  try {
    // Check custom instructions safety
    if (customInstructions) {
      const customSafety = checkPromptSafety(customInstructions);
      if (!customSafety.safe) {
        return {
          success: false,
          error: `Custom instructions blocked: ${customSafety.reason}`,
          imageBase64: "",
          mimeType: "",
        };
      }
    }

    const prompts = isExterior ? twilightExteriorPrompts : twilightInteriorPrompts;
    const basePrompt = prompts[style] || prompts["warm-dusk"];
    const prompt = customInstructions
      ? `${basePrompt}\n\nAdditional details: ${customInstructions}`
      : basePrompt;

    // Final safety check on the complete prompt
    const fullSafety = checkPromptSafety(prompt);
    if (!fullSafety.safe) {
      console.warn("[convertToTwilight] blocked unsafe prompt:", fullSafety.reason);
      return {
        success: false,
        error: `Prompt blocked: ${fullSafety.reason}`,
        imageBase64: "",
        mimeType: "",
      };
    }

    const imageBuffers = Array.isArray(imageInput) ? imageInput : [imageInput];
    const imageParts = imageBuffers.map((buf) => ({
      inlineData: { mimeType, data: buf.toString("base64") },
    }));

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");

    const contents = [{
      parts: [
        ...imageParts,
        { text: prompt },
      ],
    }];

    // Same model cascade as enhancePhoto — fail-fast, prefer 4K
    const models = [
      { name: "gemini-3-pro-image-preview", config: { responseModalities: ["IMAGE", "TEXT"], imageConfig: { imageSize: "4K" } } },
      { name: "gemini-3.1-flash-image-preview", config: { responseModalities: ["IMAGE", "TEXT"], imageConfig: { imageSize: "4K" } } },
      { name: "gemini-3.1-flash-image-preview", config: { responseModalities: ["IMAGE", "TEXT"], imageConfig: { imageSize: "2K" } } },
      { name: "gemini-2.5-flash-image", config: { responseModalities: ["IMAGE", "TEXT"] } },
    ];

    let responseData: any = null;
    let lastErr: any;

    for (const m of models) {
      try {
        const apiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${m.name}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents, generationConfig: m.config }),
          }
        );

        if (!apiResponse.ok) {
          const errText = await apiResponse.text();
          lastErr = new Error(`${m.name} ${apiResponse.status}: ${errText.substring(0, 200)}`);
          console.log(`[gemini/twilight] ${m.name} ${apiResponse.status}, trying next model`);
          continue;
        }

        responseData = await apiResponse.json();
        const hasImage = responseData?.candidates?.[0]?.content?.parts?.some((p: any) => p.inlineData);
        if (!hasImage) {
          lastErr = new Error(`${m.name} returned no image`);
          console.log(`[gemini/twilight] ${m.name} returned no image, trying next`);
          responseData = null;
          continue;
        }

        console.log(`[gemini/twilight] Success with ${m.name} (style: ${style})`);
        break;
      } catch (err: any) {
        lastErr = err;
        console.log(`[gemini/twilight] ${m.name} threw error, trying next: ${err?.message?.substring(0, 100)}`);
      }
    }

    if (!responseData) throw lastErr || new Error("No response from any model");

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
