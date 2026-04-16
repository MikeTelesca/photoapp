"use client";
import { useTheme } from "@/components/theme-provider";

const SunIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const MoonIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const MonitorIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

export function DarkModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full p-0.5 bg-graphite-100 dark:bg-graphite-800 border border-graphite-200 dark:border-graphite-700"
      role="radiogroup"
      aria-label="Theme"
    >
      <ThemeButton
        active={theme === "light"}
        onClick={() => setTheme("light")}
        icon={SunIcon}
        label="Light"
      />
      <ThemeButton
        active={theme === "dark"}
        onClick={() => setTheme("dark")}
        icon={MoonIcon}
        label="Dark"
      />
      <ThemeButton
        active={theme === "system"}
        onClick={() => setTheme("system")}
        icon={MonitorIcon}
        label="System"
      />
    </div>
  );
}

function ThemeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      title={label}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors ${
        active
          ? "bg-white dark:bg-graphite-700 text-graphite-900 dark:text-white shadow-sm"
          : "text-graphite-400 hover:text-graphite-600 dark:hover:text-graphite-200"
      }`}
    >
      {icon}
    </button>
  );
}
