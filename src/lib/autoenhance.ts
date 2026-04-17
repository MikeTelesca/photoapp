import { log } from "@/lib/logger";

// Autoenhance.ai client — real HDR bracket merge + real estate photo enhancement.
//
// Flow per bracket group:
//   1. POST /v3/orders/           → orderId
//   2. For each bracket JPEG:
//      POST /v3/brackets/         → { upload_url, bracket_id }
//      PUT upload_url (raw bytes)
//   3. POST /v3/orders/{id}/process { number_of_brackets_per_image, ai_version }
//   4. Poll GET /v3/orders/{id} until !is_merging && !is_processing && images.length
//   5. GET /v3/images/{imageId}/enhanced?preview=false → { image_url | imageSource }
//   6. Fetch that URL → raw JPEG bytes

const BASE = "https://api.autoenhance.ai/v3";
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 50; // ~4 min, under Vercel's 300s maxDuration

export type AutoenhanceOptions = {
  aiVersion?: string; // default "5.x"
  devMode?: boolean; // skips credit consumption for testing
};

export type AutoenhanceResult =
  | { success: true; imageBuffer: Buffer; mimeType: string }
  | { success: false; error: string };

export async function enhanceViaAutoenhance(
  brackets: Array<{ buffer: Buffer; name: string }>,
  options: AutoenhanceOptions = {}
): Promise<AutoenhanceResult> {
  const apiKey = process.env.AUTOENHANCE_API_KEY;
  if (!apiKey) return { success: false, error: "AUTOENHANCE_API_KEY not set" };
  if (brackets.length === 0) return { success: false, error: "No brackets provided" };

  const headers: Record<string, string> = { "x-api-key": apiKey };
  if (options.devMode) headers["x-dev-mode"] = "true";

  try {
    // 1. Create order
    log.info("autoenhance.create_order.begin", { bracketCount: brackets.length });
    const orderRes = await fetch(`${BASE}/orders/`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!orderRes.ok) {
      throw new Error(`create order ${orderRes.status}: ${await safeText(orderRes)}`);
    }
    const { order_id: orderId } = (await orderRes.json()) as { order_id: string };
    if (!orderId) throw new Error("Autoenhance returned no order_id");
    log.info("autoenhance.order_created", { orderId });

    // 2. Upload each bracket. The Autoenhance pre-signed S3 URL is signed
    // with content-type=application/octet-stream (verified by inspecting
    // the query string). The PUT MUST match or S3 returns
    // SignatureDoesNotMatch.
    for (let i = 0; i < brackets.length; i += 1) {
      const b = brackets[i];

      log.info("autoenhance.register_bracket.begin", { orderId, i, name: b.name });
      const bracketRes = await fetch(`${BASE}/brackets/`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, name: b.name }),
      });
      if (!bracketRes.ok) {
        throw new Error(`register bracket ${i} ${bracketRes.status}: ${await safeText(bracketRes)}`);
      }
      const bracketJson = (await bracketRes.json()) as {
        upload_url?: string;
        bracket_id?: string;
      };
      const uploadUrl = bracketJson.upload_url;
      if (!uploadUrl) throw new Error(`no upload_url for bracket ${i}`);
      log.info("autoenhance.bracket_registered", {
        orderId,
        i,
        bracketId: bracketJson.bracket_id,
      });

      log.info("autoenhance.upload_bracket.begin", {
        orderId,
        i,
        size: b.buffer.length,
      });
      const bytes = new Uint8Array(
        b.buffer.buffer,
        b.buffer.byteOffset,
        b.buffer.byteLength,
      );
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: bytes as unknown as BodyInit,
      });
      if (!uploadRes.ok) {
        throw new Error(`upload bracket ${i} ${uploadRes.status}: ${await safeText(uploadRes)}`);
      }
      log.info("autoenhance.bracket_uploaded", { orderId, i });
    }

    // 3. Trigger processing
    log.info("autoenhance.process.begin", { orderId });
    const processRes = await fetch(`${BASE}/orders/${orderId}/process`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        number_of_brackets_per_image: brackets.length,
        ai_version: options.aiVersion ?? "5.x",
      }),
    });
    if (!processRes.ok) {
      throw new Error(`process ${processRes.status}: ${await safeText(processRes)}`);
    }
    log.info("autoenhance.process.triggered", { orderId });

    // 4. Poll for completion
    let imageId: string | null = null;
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      const statusRes = await fetch(`${BASE}/orders/${orderId}`, { headers });
      if (!statusRes.ok) continue;
      const status = (await statusRes.json()) as {
        is_merging?: boolean;
        is_processing?: boolean;
        images?: Array<{ image_id?: string; enhanced?: boolean; error?: string | null }>;
      };

      const done = status.is_merging === false && status.is_processing === false;
      const firstImage = status.images?.[0];
      if (!done || !firstImage) continue;

      if (firstImage.error) {
        throw new Error(`Autoenhance reported error: ${firstImage.error}`);
      }
      if (firstImage.enhanced && firstImage.image_id) {
        imageId = firstImage.image_id;
        break;
      }
    }

    if (!imageId) {
      throw new Error(`Autoenhance timed out after ${(POLL_INTERVAL_MS * MAX_POLL_ATTEMPTS) / 1000}s`);
    }

    // 5. Download the enhanced image. In dev mode we use preview=true (free,
    // watermarked, low-res); full-res requires a paid plan.
    //
    // Autoenhance redirects GET /v3/images/:id/enhanced to an asset URL that
    // serves the JPEG bytes directly. Depending on whether fetch follows the
    // redirect we land on either:
    //   - Content-Type: image/* → binary body is the image
    //   - Content-Type: text/html → Flask redirect page with href target
    //   - Content-Type: application/json → legacy shape with image_url field
    const previewQuery = options.devMode ? "preview=true" : "preview=false";
    log.info("autoenhance.download.begin", { imageId, previewQuery });
    const enhancedRes = await fetch(
      `${BASE}/images/${imageId}/enhanced?${previewQuery}`,
      { headers, redirect: "follow" }
    );
    if (!enhancedRes.ok) {
      throw new Error(`get enhanced ${enhancedRes.status}: ${await safeText(enhancedRes)}`);
    }
    const finalContentType = enhancedRes.headers.get("content-type") ?? "";

    // Direct image response
    if (finalContentType.startsWith("image/")) {
      const imageBuffer = Buffer.from(await enhancedRes.arrayBuffer());
      log.info("autoenhance.download.ok", { imageId, size: imageBuffer.length, path: "direct" });
      return { success: true, imageBuffer, mimeType: finalContentType };
    }

    // Legacy JSON response — contains image URL to fetch
    if (finalContentType.includes("application/json")) {
      const enhancedJson = (await enhancedRes.json()) as Record<string, unknown>;
      const imageUrl =
        typeof enhancedJson.image_url === "string"
          ? enhancedJson.image_url
          : typeof enhancedJson.imageSource === "string"
            ? enhancedJson.imageSource
            : typeof enhancedJson.url === "string"
              ? (enhancedJson.url as string)
              : null;
      if (!imageUrl) throw new Error("Autoenhance /enhanced JSON missing image URL");
      const dlRes = await fetch(imageUrl);
      if (!dlRes.ok) throw new Error(`download image ${dlRes.status}`);
      const imageBuffer = Buffer.from(await dlRes.arrayBuffer());
      const mimeType = dlRes.headers.get("content-type") ?? "image/jpeg";
      log.info("autoenhance.download.ok", { imageId, size: imageBuffer.length, path: "json" });
      return { success: true, imageBuffer, mimeType };
    }

    // HTML redirect page — parse the target href and follow it manually
    const html = await enhancedRes.text();
    const hrefMatch = html.match(/href="([^"]+)"/i);
    if (hrefMatch) {
      const target = hrefMatch[1].startsWith("http")
        ? hrefMatch[1]
        : `https://api.autoenhance.ai${hrefMatch[1]}`;
      const followRes = await fetch(target, { headers });
      if (!followRes.ok) throw new Error(`follow download ${followRes.status}`);
      const imageBuffer = Buffer.from(await followRes.arrayBuffer());
      const mimeType = followRes.headers.get("content-type") ?? "image/jpeg";
      log.info("autoenhance.download.ok", { imageId, size: imageBuffer.length, path: "html-follow" });
      return { success: true, imageBuffer, mimeType };
    }

    throw new Error(
      `Unexpected /enhanced response content-type: ${finalContentType}. Body prefix: ${html.slice(0, 200)}`,
    );
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown Autoenhance error",
    };
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    const t = await res.text();
    return t.slice(0, 500);
  } catch {
    return "";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function guessMimeType(filename: string): string {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}
