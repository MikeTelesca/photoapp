const COLORS = [
  { bg: "bg-cyan-50 dark:bg-cyan-900/30", text: "text-cyan-800 dark:text-cyan-300" },
  { bg: "bg-purple-50 dark:bg-purple-900/30", text: "text-purple-800 dark:text-purple-300" },
  { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-800 dark:text-emerald-300" },
  { bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300" },
  { bg: "bg-rose-50 dark:bg-rose-900/30", text: "text-rose-800 dark:text-rose-300" },
  { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-300" },
  { bg: "bg-indigo-50 dark:bg-indigo-900/30", text: "text-indigo-800 dark:text-indigo-300" },
  { bg: "bg-teal-50 dark:bg-teal-900/30", text: "text-teal-800 dark:text-teal-300" },
];

// Special-case high-priority tags
const SPECIAL: Record<string, { bg: string; text: string }> = {
  urgent: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-800 dark:text-red-300" },
  rush: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-800 dark:text-red-300" },
  hot: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-800 dark:text-red-300" },
  reshoot: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300" },
  draft: { bg: "bg-graphite-100 dark:bg-graphite-800", text: "text-graphite-600 dark:text-graphite-400" },
};

export function tagColor(tag: string): { bg: string; text: string } {
  const lower = tag.toLowerCase().trim();
  if (SPECIAL[lower]) return SPECIAL[lower];

  // Hash to consistent color from COLORS palette
  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = (hash << 5) - hash + lower.charCodeAt(i);
    hash |= 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}
