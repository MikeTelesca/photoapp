const VALID_TOKENS = [
  "{address}",
  "{client}",
  "{date}",
  "{preset}",
  "{seq}",
  "{photographer}",
];

export function applyPattern(opts: {
  pattern: string;
  address: string;
  client?: string;
  preset?: string;
  photographer?: string;
  index: number;
  total: number;
}): string {
  const seq = String(opts.index).padStart(String(opts.total).length, "0");
  const date = new Date().toISOString().slice(0, 10);

  let name = opts.pattern || "{address}-{seq}";

  // Slug helper: convert to lowercase, replace non-alphanumeric with dashes, trim dashes
  const slug = (s: string) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  name = name
    .replace(/\{address\}/g, slug(opts.address))
    .replace(/\{client\}/g, slug(opts.client || ""))
    .replace(/\{date\}/g, date)
    .replace(/\{preset\}/g, slug(opts.preset || ""))
    .replace(/\{photographer\}/g, slug(opts.photographer || ""))
    .replace(/\{seq\}/g, seq);

  // Clean up double dashes and trailing/leading dashes
  name = name.replace(/--+/g, "-").replace(/^-+|-+$/g, "");

  return `${name}.jpg`;
}

export function previewPattern(pattern: string): string {
  return applyPattern({
    pattern,
    address: "123 Main St",
    client: "Keller Williams",
    preset: "luxury",
    photographer: "Mike",
    index: 1,
    total: 50,
  });
}

/**
 * Generate first / middle / last sample filenames for a sample 25-photo job
 * so users can see how padding and {seq} expand across a real delivery.
 */
export function previewPatternSamples(pattern: string): {
  first: string;
  middle: string;
  last: string;
} {
  const total = 25;
  const mk = (index: number) =>
    applyPattern({
      pattern,
      address: "123 Main St",
      client: "Keller Williams",
      preset: "luxury",
      photographer: "Mike",
      index,
      total,
    });
  return {
    first: mk(1),
    middle: mk(Math.ceil(total / 2)),
    last: mk(total),
  };
}

/**
 * Ensure a filename is unique within the given set by appending -1, -2, ...
 * before the extension on collision. Mutates `used` by adding the returned name.
 */
export function dedupeFilename(filename: string, used: Set<string>): string {
  if (!used.has(filename)) {
    used.add(filename);
    return filename;
  }
  const dot = filename.lastIndexOf(".");
  const base = dot === -1 ? filename : filename.slice(0, dot);
  const ext = dot === -1 ? "" : filename.slice(dot);
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = `${base}-${n}${ext}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    n++;
  }
}
