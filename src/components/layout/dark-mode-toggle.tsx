"use client";
import { useTheme } from "@/components/theme-provider";

export function DarkModeToggle() {
  const { theme, setTheme } = useTheme();

  // Cycle: light → dark → system → light
  function cycle() {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }

  const icon = theme === "light" ? "☀" : theme === "dark" ? "🌙" : "🖥";
  const label = theme === "light" ? "Light" : theme === "dark" ? "Dark" : "Auto";

  return (
    <button
      onClick={cycle}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-graphite-200 dark:border-graphite-700 hover:bg-graphite-50 dark:hover:bg-graphite-800 text-graphite-600 dark:text-graphite-300 transition-colors"
      title={`Current: ${label}. Click to cycle (light → dark → auto)`}
    >
      <span>{icon}</span>
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
