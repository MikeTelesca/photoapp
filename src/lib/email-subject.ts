// Replace tokens in user-defined subject template
// Available: {address}, {client}, {photographer}, {count}
export function applySubject(
  template: string,
  vars: { address?: string; client?: string; photographer?: string; count?: number }
): string {
  let out = template;
  out = out.replace(/\{address\}/g, vars.address || "");
  out = out.replace(/\{client\}/g, vars.client || "");
  out = out.replace(/\{photographer\}/g, vars.photographer || "");
  out = out.replace(/\{count\}/g, String(vars.count ?? ""));
  return out.trim() || `Photos for ${vars.address || "your job"}`;
}
