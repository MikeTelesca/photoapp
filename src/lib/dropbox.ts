import { Dropbox } from "dropbox";

const dbx = new Dropbox({
  accessToken: process.env.DROPBOX_ACCESS_TOKEN,
  fetch: globalThis.fetch,
});

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
      response = await dbx.filesListFolderContinue({ cursor });
    } else {
      response = await dbx.filesListFolder({
        path: "",
        shared_link: { url: sharedLink },
        recursive: true,
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
 * Download a single file from a Dropbox shared link.
 * Returns the file as a Buffer.
 */
export async function downloadFileFromSharedLink(
  sharedLink: string,
  filePath: string
): Promise<Buffer> {
  const response = await dbx.sharingGetSharedLinkFile({
    url: sharedLink,
    path: filePath,
  });

  // The Dropbox SDK attaches file data as fileBinary on the result
  const result = response.result as unknown as Record<string, unknown>;
  const binary = result.fileBinary;

  if (binary instanceof Buffer) {
    return binary;
  }

  if (binary instanceof Uint8Array) {
    return Buffer.from(binary.buffer, binary.byteOffset, binary.byteLength);
  }

  if (binary instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(binary));
  }

  // Handle Blob-like objects (edge/browser environments)
  if (
    binary &&
    typeof binary === "object" &&
    "arrayBuffer" in binary &&
    typeof (binary as { arrayBuffer: unknown }).arrayBuffer === "function"
  ) {
    const ab = await (binary as Blob).arrayBuffer();
    return Buffer.from(ab);
  }

  throw new Error("Unexpected file binary format from Dropbox API");
}

/**
 * Upload a file to Dropbox and return a shared link URL.
 */
export async function uploadToDropbox(
  buffer: Buffer,
  path: string
): Promise<string> {
  // Upload the file
  const uploadResponse = await dbx.filesUpload({
    path,
    contents: buffer,
    mode: { ".tag": "overwrite" },
  });

  // Create a shared link
  try {
    const linkResponse = await dbx.sharingCreateSharedLinkWithSettings({
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
      const links = await dbx.sharingListSharedLinks({
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
 * Test the Dropbox connection by getting account info.
 */
export async function testConnection(): Promise<{
  name: string;
  email: string;
}> {
  const response = await dbx.usersGetCurrentAccount();
  return {
    name: response.result.name.display_name,
    email: response.result.email,
  };
}
