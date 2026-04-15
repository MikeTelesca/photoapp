"use client";

interface Props {
  password: string;
}

function scorePassword(p: string): { score: number; label: string; color: string; tips: string[] } {
  let score = 0;
  const tips: string[] = [];

  if (p.length >= 8) score++;
  else tips.push("at least 8 characters");

  if (p.length >= 12) score++;

  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  else if (p.length >= 8) tips.push("mix upper and lowercase");

  if (/[0-9]/.test(p)) score++;
  else if (p.length >= 8) tips.push("add a number");

  if (/[^A-Za-z0-9]/.test(p)) score++;
  else if (p.length >= 8) tips.push("add a symbol");

  // Dock if common patterns
  if (/^(password|12345|qwerty|letmein|admin)/i.test(p)) score = Math.max(0, score - 3);

  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong", "Very strong"];
  const colors = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-500"];
  const clamped = Math.min(5, Math.max(0, score));

  return { score: clamped, label: labels[clamped], color: colors[clamped], tips };
}

export function PasswordStrength({ password }: Props) {
  if (!password) return null;

  const { score, label, color, tips } = scorePassword(password);
  const pct = (score / 5) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-graphite-200 dark:bg-graphite-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-[10px] font-semibold ${
          score <= 1 ? "text-red-600" :
          score <= 3 ? "text-amber-600" :
          "text-emerald-600"
        }`}>
          {label}
        </span>
      </div>
      {tips.length > 0 && (
        <div className="text-[10px] text-graphite-500 dark:text-graphite-400">
          Try: {tips.join(", ")}
        </div>
      )}
    </div>
  );
}
