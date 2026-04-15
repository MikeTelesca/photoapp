export interface SafetyResult {
  safe: boolean;
  reason?: string;
}

const BLOCKED_PATTERNS = [
  // Obvious off-topic instructions
  /\b(write|create|generate)\s+(an?\s+)?(essay|story|poem|article|email|message|code|program|script)\b/i,
  /\b(answer|tell\s+me|explain)\s+(this|the\s+following)\s+question/i,
  /\b(translate|summarize|rewrite)\s+(the\s+following|this)\b/i,
  // Prompt injection attempts
  /ignore\s+(previous|prior|all|the)\s+(instructions|prompts)/i,
  /system\s+prompt[:\s]/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /forget\s+(everything|all|your)\s+(previous|prior|instructions)/i,
  // NSFW/controversial content
  /\b(nude|naked|nsfw|porn|sex)\b/i,
  /\b(violence|gore|blood|kill)\b/i,
  // Off-platform content
  /\b(political|election|propaganda|conspiracy)\b/i,
];

export function checkPromptSafety(prompt: string | null | undefined): SafetyResult {
  if (!prompt) return { safe: true };

  const text = prompt.trim();
  if (!text) return { safe: true };

  // Length check (likely abuse if 5000+ chars in custom instructions)
  if (text.length > 5000) {
    return { safe: false, reason: "Prompt is too long (max 5000 characters)" };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        safe: false,
        reason: `Prompt contains pattern outside the scope of real estate photo editing. Edit your prompt and try again.`,
      };
    }
  }

  return { safe: true };
}
