export function formatJobNumber(opts: {
  prefix?: string | null;
  year?: number;
  sequence?: number | null;
  createdAt?: Date | string;
}): string {
  const year = opts.year || (opts.createdAt ? new Date(opts.createdAt).getFullYear() : new Date().getFullYear());
  const seq = opts.sequence || 0;
  const prefix = opts.prefix || "JOB";
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}
