import Link from "next/link";
import { PlusIcon, PaintBrushIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

const actions = [
  { label: "New job", href: "/jobs/new", icon: PlusIcon, primary: true },
  { label: "Presets", href: "/presets", icon: PaintBrushIcon },
  { label: "Export", href: "/api/jobs/export-csv", icon: ArrowDownTrayIcon },
];

export function QuickActions() {
  return (
    <div className="flex items-center gap-2">
      {actions.map((a) => {
        const base =
          "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-sm font-medium transition-colors";
        const variant = a.primary
          ? "bg-graphite-900 dark:bg-white text-white dark:text-graphite-900 hover:bg-graphite-800 dark:hover:bg-graphite-100"
          : "bg-white dark:bg-graphite-900 text-graphite-900 dark:text-white border border-graphite-200 dark:border-graphite-800 hover:bg-graphite-50 dark:hover:bg-graphite-800";
        return (
          <Link key={a.label} href={a.href} className={`${base} ${variant}`}>
            <a.icon className="w-4 h-4" aria-hidden />
            {a.label}
          </Link>
        );
      })}
    </div>
  );
}
