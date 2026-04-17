import { Dropbox } from "dropbox";

function getDropboxClient(): Dropbox {
  // If we have a refresh token, use it (auto-refreshes)
  if (process.env.DROPBOX_REFRESH_TOKEN) {
    return new Dropbox({
      clientId: process.env.DROPBOX_APP_KEY,
      clientSecret: process.env.DROPBOX_APP_SECRET,
      refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
      fetch: globalThis.fetch,
    });
  }

  // Fallback to static access token (short-lived, for development)
  if (process.env.DROPBOX_ACCESS_TOKEN) {
    return new Dropbox({
      accessToken: process.env.DROPBOX_ACCESS_TOKEN,
      fetch: globalThis.fetch,
    });
  }

  throw new Error("No Dropbox credentials configured. Set DROPBOX_REFRESH_TOKEN or DROPBOX_ACCESS_TOKEN.");
}

// Use a function to get fresh client each time (refresh token may rotate)
function getDbx(): Dropbox {
  return getDropboxClient();
}

export interface DropboxFile {
  name: string;
  path: string;
  size: number;
  id: string;
}

// Image extensions we care about for real estate photography
const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".tif",
  ".tiff",
  ".dng",
  ".cr2",
  ".cr3",
  ".arw",
  ".nef",
  ".raf",
];

/**
 * List all image files from a Dropbox shared link.
 * Supports shared folder links like:
 *   https://www.dropbox.com/sh/abc123/...
 *   https://www.dropbox.com/scl/fo/abc123/...
 */
export async function listFilesFromSharedLink(
  sharedLink: string
): Promise<DropboxFile[]> {
  const files: DropboxFile[] = [];
  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    let response;
    if (cursor) {
      response = await getDbx().filesListFolderContinue({ cursor });
    } else {
      response = await getDbx().filesListFolder({
        path: "",
        shared_link: { url: sharedLink },
        limit: 2000,
      });
    }

    const result = response.result;

    for (const entry of result.entries) {
      if (entry[".tag"] === "file") {
        const ext = entry.name
          .toLowerCase()
          .slice(entry.name.lastIndexOf("."));
        if (IMAGE_EXTENSIONS.includes(ext)) {
          files.push({
            name: entry.name,
            path: entry.path_lower || entry.path_display || "",
            size: "size" in entry ? (entry.size as number) : 0,
            id: entry.id || "",
          });
        }
      }
    }

    hasMore = result.has_more;
    cursor = result.cursor;
  }

  // Sort by name for consistent ordering
  files.sort((a, b) => a.name.localeCompare(b.name));

  return files;
}

/**
 * Download a file from a Dropbox path we own (no shared link needed).
 * Uses filesGetTemporaryLink → fetch rather than filesDownload so we avoid
 * the SDK's varying `fileBinary` shapes across runtimes (it can hand back
 * Buffer, Uint8Array, ArrayBuffer, Blob, or a ReadableStream depending on
 * environment). fetch().arrayBuffer() is consistent everywhere.
 */
export async function downloadInternalFile(path: string): Promise<Buffer> {
  const link = await getTemporaryLink(path);
  const res = await fetch(link);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`download ${path} via temp link ${res.status}: ${body.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Download a single file from a Dropbox shared link.
 * Returns the file as a Buffer. Robust across SDK binary-shape variance.
 */
export async function downloadFileFromSharedLink(
  sharedLink: string,
  filePath: string
): Promise<Buffer> {
  const response = await getDbx().sharingGetSharedLinkFile({
    url: sharedLink,
    path: filePath,
  });

  const result = response.result as unknown as Record<string, unknown>;
  const binary = result.fileBinary;

  if (binary instanceof Buffer) return binary;
  if (binary instanceof Uint8Array) {
    return Buffer.from(binary.buffer, binary.byteOffset, binary.byteLength);
  }
  if (binary instanceof ArrayBuffer) return Buffer.from(new Uint8Array(binary));
  if (
    binary &&
    typeof binary === "object" &&
    "arrayBuffer" in binary &&
    typeof (binary as { arrayBuffer: unknown }).arrayBuffer === "function"
  ) {
    const ab = await (binary as Blob).arrayBuffer();
    return Buffer.from(ab);
  }

  // ReadableStream (Web) — collect chunks
  if (
    binary &&
    typeof binary === "object" &&
    "getReader" in binary &&
    typeof (binary as { getReader: unknown }).getReader === "function"
  ) {
    const reader = (binary as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.length;
      }
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return Buffer.from(out);
  }

  // Node Readable stream — collect data events
  if (
    binary &&
    typeof binary === "object" &&
    "on" in binary &&
    typeof (binary as { on: unknown }).on === "function"
  ) {
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = binary as NodeJS.ReadableStream;
      stream.on("data", (c) => chunks.push(typeof c === "string" ? Buffer.from(c) : c));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", (err) => reject(err));
    });
  }

  throw new Error(
    `Unexpected file binary format from Dropbox API: ${Object.prototype.toString.call(binary)}`,
  );
}

/**
 * Upload a file to an internal Dropbox path (no shared link needed).
 * Used for direct uploads from the app (not from external shared links).
 */
export async function uploadInternalFile(
  buffer: Buffer,
  path: string
): Promise<{ path: string; size: number }> {
  const dbx = getDbx();
  const result = await dbx.filesUpload({
    path,
    contents: buffer,
    mode: { ".tag": "overwrite" },
  });
  return {
    path: (result.result as any).path_display || path,
    size: (result.result as any).size || 0,
  };
}

/**
 * Upload a file to Dropbox and return a shared link URL.
 */
export async function uploadToDropbox(
  buffer: Buffer,
  path: string
): Promise<string> {
  // Upload the file
  const uploadResponse = await getDbx().filesUpload({
    path,
    contents: buffer,
    mode: { ".tag": "overwrite" },
  });

  // Create a shared link
  try {
    const linkResponse = await getDbx().sharingCreateSharedLinkWithSettings({
      path: uploadResponse.result.path_display || path,
      settings: {
        requested_visibility: { ".tag": "public" },
        audience: { ".tag": "public" },
        access: { ".tag": "viewer" },
      },
    });
    // Convert share link to direct download link
    return linkResponse.result.url.replace("dl=0", "dl=1");
  } catch (error: any) {
    // If link already exists, get the existing one
    if (error?.error?.error?.[".tag"] === "shared_link_already_exists") {
      const links = await getDbx().sharingListSharedLinks({
        path: uploadResponse.result.path_display || path,
        direct_only: true,
      });
      if (links.result.links.length > 0) {
        return links.result.links[0].url.replace("dl=0", "dl=1");
      }
    }
    throw error;
  }
}

/**
 * Get a 4-hour temporary direct-download link for a file at a Dropbox path.
 * Used by /thumb to stream un-enhanced originals for display without needing
 * a permanent share link per file.
 */
export async function getTemporaryLink(path: string): Promise<string> {
  const res = await getDbx().filesGetTemporaryLink({ path });
  return res.result.link;
}

/**
 * Fetch a file from Dropbox via a temporary link. Used by /thumb to resize
 * originals for display.
 */
export async function downloadViaTemporaryLink(path: string): Promise<Buffer> {
  const link = await getTemporaryLink(path);
  const res = await fetch(link);
  if (!res.ok) throw new Error(`Fetch temp link failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Test the Dropbox connection by getting account info.
 */
export async function testConnection(): Promise<{
  name: string;
  email: string;
}> {
  const response = await getDbx().usersGetCurrentAccount();
  return {
    name: response.result.name.display_name,
    email: response.result.email,
  };
}

/**
 * Sanitize a name for use as a Dropbox folder segment.
 * Dropbox disallows: < > : " / \ | ? * and leading/trailing dots or whitespace.
 */
export function sanitizeFolderName(raw: string): string {
  const cleaned = raw
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 200);
  return cleaned || "untitled";
}

/**
 * Create a folder at the given Dropbox path. If the folder already exists,
 * returns the existing path instead of erroring.
 */
export async function createFolder(path: string): Promise<{ path: string }> {
  try {
    const res = await getDbx().filesCreateFolderV2({ path, autorename: false });
    const meta = res.result.metadata as unknown as Record<string, unknown>;
    return { path: (meta.path_display as string) || path };
  } catch (error: unknown) {
    // Surface the actual Dropbox error tag so "conflict" is not an error.
    const maybe = error as { error?: { error?: { ".tag"?: string; path?: { ".tag"?: string } } } };
    const tag = maybe?.error?.error?.path?.[".tag"];
    if (tag === "conflict") return { path };
    throw error;
  }
}

/**
 * Turn a Dropbox share URL into a raw-inline URL suitable for <img src>.
 * Dropbox's share URLs come with `?dl=0`, which hits an HTML preview page.
 * Swapping to `?raw=1` makes Dropbox serve the file bytes directly.
 */
export function toRawDropboxUrl(shareUrl: string): string {
  if (shareUrl.includes("?dl=0")) return shareUrl.replace("?dl=0", "?raw=1");
  if (shareUrl.includes("&dl=0")) return shareUrl.replace("&dl=0", "&raw=1");
  if (shareUrl.includes("?dl=1")) return shareUrl.replace("?dl=1", "?raw=1");
  if (shareUrl.includes("&dl=1")) return shareUrl.replace("&dl=1", "&raw=1");
  return shareUrl + (shareUrl.includes("?") ? "&raw=1" : "?raw=1");
}

/**
 * Slugify a string for use as a filename segment. Real-estate deliverables
 * typically embed the property address in the filename so the agent's
 * downloaded copy is self-describing.
 */
export function slugifyForFilename(raw: string): string {
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || "photo";
}

/**
 * Persist an enhanced photo to Dropbox. Generates a 2560-px JPEG (display-
 * size) and a 640-px JPEG (preview thumb), uploads both into the job's
 * property folder alongside the shooter's originals. Returns the raw-inline
 * Dropbox URLs for <img src> use. Caller stores those URLs on Photo.editedUrl
 * and Photo.thumbnailUrl — no multi-MB base64 data URLs in Postgres.
 *
 * File layout (clean, address-based naming):
 *   {destFolderPath}/{fileBaseName}.jpg         (full 2560px)
 *   {destFolderPath}/_thumbs/{fileBaseName}.jpg (preview 640px)
 */
export async function persistEnhancedEdit(args: {
  imageBuffer: Buffer;
  destFolderPath: string;
  fileBaseName: string;
}): Promise<{ editedUrl: string; thumbnailUrl: string }> {
  const sharp = (await import("sharp")).default;

  const [fullJpeg, thumbJpeg] = await Promise.all([
    sharp(args.imageBuffer)
      .rotate()
      .resize(2560, 2560, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer(),
    sharp(args.imageBuffer)
      .rotate()
      .resize(640, 640, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer(),
  ]);

  // Ensure the destination folder (usually agent/property folder) exists
  // along with the _thumbs subfolder. Creates are idempotent in our helper.
  try {
    await createFolder(args.destFolderPath);
  } catch {
    /* non-fatal */
  }
  const thumbsFolder = `${args.destFolderPath}/_thumbs`;
  try {
    await createFolder(thumbsFolder);
  } catch {
    /* non-fatal */
  }

  const fullPath = `${args.destFolderPath}/${args.fileBaseName}.jpg`;
  const thumbPath = `${thumbsFolder}/${args.fileBaseName}.jpg`;

  await Promise.all([
    uploadInternalFile(fullJpeg, fullPath),
    uploadInternalFile(thumbJpeg, thumbPath),
  ]);

  const [fullShare, thumbShare] = await Promise.all([
    createShareLinkForPath(fullPath),
    createShareLinkForPath(thumbPath),
  ]);

  return {
    editedUrl: toRawDropboxUrl(fullShare),
    thumbnailUrl: toRawDropboxUrl(thumbShare),
  };
}

/**
 * Create (or fetch existing) a public share link for a Dropbox path.
 * Returns the www.dropbox.com share URL (not a direct download).
 */
export async function createShareLinkForPath(path: string): Promise<string> {
  try {
    const linkResponse = await getDbx().sharingCreateSharedLinkWithSettings({
      path,
      settings: {
        requested_visibility: { ".tag": "public" },
        audience: { ".tag": "public" },
        access: { ".tag": "viewer" },
      },
    });
    return linkResponse.result.url;
  } catch (error: unknown) {
    const maybe = error as { error?: { error?: { ".tag"?: string } } };
    if (maybe?.error?.error?.[".tag"] === "shared_link_already_exists") {
      const existing = await getDbx().sharingListSharedLinks({ path, direct_only: true });
      if (existing.result.links.length > 0) return existing.result.links[0].url;
    }
    throw error;
  }
}
