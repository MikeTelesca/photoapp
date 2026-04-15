export interface LintIssue {
  severity: "warn" | "info";
  message: string;
}

const HALLUCINATION_PATTERNS = [
  { pattern: /\b(add a|create a|imagine|generate a|invent|make up)\b/gi, message: "Phrases like 'add a' or 'create' can cause AI to hallucinate fake objects" },
  { pattern: /\b(replace|swap|change to)\b/gi, message: "Replace/swap instructions can produce unrealistic substitutions" },
];

const CONFLICT_PAIRS = [
  ["brighten", "darken"],
  ["warm", "cool"],
  ["increase contrast", "reduce contrast"],
  ["sharpen", "blur"],
];

export function lintPrompt(text: string): LintIssue[] {
  const issues: LintIssue[] = [];
  if (!text) return issues;

  // Length
  if (text.length > 2000) {
    issues.push({ severity: "warn", message: `Very long prompt (${text.length} chars). AI may ignore later sections.` });
  }
  if (text.length < 30) {
    issues.push({ severity: "info", message: "Short prompt — consider adding more specific instructions for better results." });
  }

  // Hallucination patterns
  for (const { pattern, message } of HALLUCINATION_PATTERNS) {
    if (pattern.test(text)) {
      issues.push({ severity: "warn", message });
    }
  }

  // Conflicts
  const lower = text.toLowerCase();
  for (const [a, b] of CONFLICT_PAIRS) {
    if (lower.includes(a) && lower.includes(b)) {
      issues.push({ severity: "warn", message: `Conflicting: prompt contains both "${a}" and "${b}"` });
    }
  }

  // Missing critical patterns for real estate
  if (lower.includes("perspective") && !lower.includes("vertical line") && !lower.includes("straighten")) {
    issues.push({ severity: "info", message: "Mentions 'perspective' but not 'vertical lines' — consider adding straightening instructions." });
  }

  // Excessive uppercase (shouting)
  const uppercaseRatio = (text.match(/[A-Z]/g) || []).length / Math.max(1, text.length);
  if (uppercaseRatio > 0.3 && text.length > 50) {
    issues.push({ severity: "info", message: "Heavy use of UPPERCASE — Gemini may not respond as expected to all-caps emphasis." });
  }

  return issues;
}
