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
