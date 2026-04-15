import { Dropbox } from "dropbox";

interface WatermarkConfig {
  watermarkText?: string | null;
  watermarkPosition?: string;
  watermarkSize?: number;
  watermarkOpacity?: number;
  watermarkLogoPath?: string | null;
}

function getDropboxClient(): Dropbox {
  if (process.env.DROPBOX_REFRESH_TOKEN) {
    return new Dropbox({
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
      refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
      fetch: globalThis.fetch,
    });
  }

  if (process.env.DROPBOX_ACCESS_TOKEN) {
    return new Dropbox({
      accessToken: process.env.DROPBOX_ACCESS_TOKEN,
      fetch: globalThis.fetch,
    });
  }

  throw new Error("No Dropbox credentials configured");
}

async function downloadLogoFromDropbox(logoPath: string): Promise<Buffer> {
  const dbx = getDropboxClient();
  const dl = await dbx.filesDownload({ path: logoPath });
  const result = dl.result as any;
  const binary = result.fileBinary;

  if (binary instanceof Buffer) {
    return binary;
  }

  if (binary instanceof Uint8Array) {
    return Buffer.from(binary.buffer, binary.byteOffset, binary.byteLength);
  }

  if (binary instanceof ArrayBuffer) {
    return Buffer.from(binary);
  }

  throw new Error("Unexpected file binary format from Dropbox API");
}

export async function applyWatermark(
  imageBuffer: Buffer,
  config: WatermarkConfig
): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  let output = imageBuffer;

  // Apply logo watermark if configured
  if (config.watermarkLogoPath) {
    try {
      const logoBuf = await downloadLogoFromDropbox(config.watermarkLogoPath);
      const logoHeight = config.watermarkSize || 80;

      const logoResized = await sharp(logoBuf)
        .resize({ height: logoHeight, withoutEnlargement: true })
        .png()
        .toBuffer();

      const gravityMap: Record<string, string> = {
        "top-left": "northwest",
        "top-right": "northeast",
        "bottom-left": "southwest",
        "bottom-right": "southeast",
        center: "center",
      };
      const gravity = gravityMap[config.watermarkPosition || "bottom-right"] || "southeast";

      const opacity = config.watermarkOpacity ?? 0.7;
      output = await sharp(output)
        .composite([
          {
            input: logoResized,
            gravity: gravity as any,
            blend: "over",
          },
        ])
        .toBuffer();
    } catch (err) {
      console.error("logo overlay err:", err);
      // Silently continue without logo on error
    }
  }
  // Apply text watermark if logo is not set
  else if (config.watermarkText && config.watermarkText.trim().length > 0) {
    try {
      const meta = await sharp(output).metadata();
      const w = meta.width || 1920;
      const h = meta.height || 1080;

      const fontSize = config.watermarkSize || 32;
      const opacity = config.watermarkOpacity ?? 0.7;
      const position = config.watermarkPosition || "bottom-right";

      const gravityMap: Record<string, string> = {
        "top-left": "northwest",
        "top-right": "northeast",
        "bottom-left": "southwest",
        "bottom-right": "southeast",
        center: "center",
      };
      const gravity = gravityMap[position] || "southeast";

      const textX = position.includes("right") ? "95%" : position.includes("left") ? "5%" : "50%";
      const textAnchor = position.includes("right") ? "end" : position.includes("left") ? "start" : "middle";
      const svgHeight = fontSize * 2 + 8;
      const safeText = config.watermarkText.replace(/[<>&"']/g, "");

      const svg = `<svg width="${w}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
        <text x="${textX}" y="${fontSize + 4}" text-anchor="${textAnchor}"
              font-family="Helvetica, Arial, sans-serif"
              font-size="${fontSize}"
              font-weight="600"
              fill="white"
              fill-opacity="${opacity}"
              stroke="black"
              stroke-width="1"
              stroke-opacity="${opacity * 0.5}">${safeText}</text>
      </svg>`;

      output = await sharp(output)
        .composite([{ input: Buffer.from(svg), gravity: gravity as any }])
        .toBuffer();
    } catch (err) {
      console.error("text watermark err:", err);
      // Silently continue without watermark on error
    }
  }

  return output;
}
