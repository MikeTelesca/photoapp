import Link from "next/link";

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Optional back-link shown to the left of the title. */
  back?: { href: string; label?: string };
}

/**
 * Page-title header. The global TopNav handles navigation; this is just a
 * consistent heading row inside each page. No background / no sticky / no
 * search field — keep it quiet so the page's content is the star.
 */
export function Topbar({ title, subtitle, actions, back }: TopbarProps) {
  return (
    <header className="mx-auto max-w-7xl px-6 pt-8 pb-2 flex items-start justify-between gap-4 flex-wrap">
      <div>
        {back && (
          <Link
            href={back.href}
            className="inline-flex items-center gap-1 text-xs text-graphite-500 dark:text-graphite-400 hover:text-cyan mb-2"
          >
            ← {back.label ?? "Back"}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-graphite-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-graphite-500 dark:text-graphite-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
