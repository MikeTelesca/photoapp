const ALLOWED_TAGS = [
  // Room types
  "kitchen", "bathroom", "bedroom", "living-room", "dining-room", "office", "garage", "basement", "foyer", "hallway",
  // Exterior
  "exterior", "backyard", "frontyard", "pool", "deck", "patio", "driveway",
  // Features
  "fireplace", "staircase", "view",
  // Time of day
  "twilight", "daytime", "interior",
];

export async function detectPhotoTags(imageUrl: string): Promise<string[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  let imageData: string;
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return [];
    const buf = Buffer.from(await res.arrayBuffer());
    imageData = buf.toString("base64");
  } catch {
    return [];
  }

  const prompt = `Look at this real estate photo. Identify what it shows from this exact list: ${ALLOWED_TAGS.join(", ")}.

Rules:
- Only return tags from that list (no new tags)
- 1-4 tags per photo
- Include room type + time of day
- Output ONLY a JSON array like: ["kitchen", "interior", "daytime"]
- No markdown, no preamble`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: imageData } },
            ],
          }],
        }),
      }
    );

    if (!resp.ok) return [];
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = text.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t: unknown) => typeof t === "string" && ALLOWED_TAGS.includes(t as string)).slice(0, 4) as string[];
  } catch {
    return [];
  }
}
