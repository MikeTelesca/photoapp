"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { DarkModeToggle } from "@/components/layout/dark-mode-toggle";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

/* icons — stroke-only, 18px. small + crisp, matches inspo density */
const I = {
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l9-8 9 8" /><path d="M5 10v10h14V10" />
    </svg>
  ),
  review: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  processing: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" />
    </svg>
  ),
  done: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  ),
  template: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
    </svg>
  ),
  trash: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
    </svg>
  ),
  clients: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1A4 4 0 0 1 16 11" />
    </svg>
  ),
  presets: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" />
    </svg>
  ),
  play: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" />
    </svg>
  ),
  camera: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
    </svg>
  ),
  chart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-7" />
    </svg>
  ),
  activity: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  dollar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  collapse: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  help: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
    </svg>
  ),
};

const groups: NavGroup[] = [
  {
    label: "Jobs",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: I.home, exact: true },
      { label: "Needs review", href: "/dashboard?status=review", icon: I.review },
      { label: "Processing", href: "/dashboard?status=processing", icon: I.processing },
      { label: "Completed", href: "/dashboard?status=approved", icon: I.done },
      { label: "Calendar", href: "/calendar", icon: I.calendar },
      { label: "Templates", href: "/templates", icon: I.template },
      { label: "Trash", href: "/trash", icon: I.trash },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Clients", href: "/clients", icon: I.clients },
      { label: "Photographers", href: "/photographers", icon: I.camera, adminOnly: true },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Presets", href: "/presets", icon: I.presets },
      { label: "Playground", href: "/playground", icon: I.play },
      { label: "Search", href: "/search", icon: I.search },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Users", href: "/admin/users", icon: I.users, adminOnly: true },
      { label: "Analytics", href: "/analytics", icon: I.chart, adminOnly: true },
      { label: "Activity", href: "/activity", icon: I.activity, adminOnly: true },
      { label: "Billing", href: "/billing", icon: I.dollar },
    ],
  },
];

export function SideNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "admin";
  const [collapsed, setCollapsed] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("side-nav-collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("side-nav-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  function isActive(href: string, exact?: boolean) {
    if (!pathname) return false;
    const [hrefPath, hrefQuery] = href.split("?");
    if (exact) return pathname === hrefPath;
    if (hrefQuery) {
      // match only when the actual URL has this query — we can't read it from usePathname,
      // so for query-scoped items we only highlight on exact path match + query hint via sessionStorage noop.
      // Simplest: highlight only when pathname matches exactly AND we're NOT on the root dashboard.
      return false;
    }
    return pathname === hrefPath || pathname.startsWith(hrefPath + "/");
  }

  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.adminOnly || isAdmin) }))
    .filter((g) => g.items.length > 0);

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 transition-[width] duration-200 ease-out ${
        collapsed ? "w-[68px]" : "w-[240px]"
      } h-screen sticky top-0 border-r border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-950`}
      aria-label="Primary"
    >
      {/* wordmark + collapse */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-graphite-100 dark:border-graphite-900">
        <Link
          href="/dashboard"
          className="font-semibold text-[17px] tracking-[-0.05em] hover:opacity-80 transition-opacity"
        >
          {collapsed ? (
            <span className="text-cyan">B</span>
          ) : (
            <>
              <span className="text-graphite-900 dark:text-white">Batch</span>
              <span className="text-cyan">Base</span>
            </>
          )}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="w-6 h-6 rounded-md text-graphite-400 hover:text-graphite-900 dark:hover:text-white hover:bg-graphite-100 dark:hover:bg-graphite-900 flex items-center justify-center"
            aria-label="Collapse sidebar"
            title="Collapse"
          >
            {I.collapse}
          </button>
        )}
      </div>

      {/* expand button when collapsed */}
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 w-8 h-8 rounded-md text-graphite-400 hover:text-graphite-900 dark:hover:text-white hover:bg-graphite-100 dark:hover:bg-graphite-900 flex items-center justify-center rotate-180"
          aria-label="Expand sidebar"
          title="Expand"
        >
          {I.collapse}
        </button>
      )}

      {/* nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {visibleGroups.map((g) => (
          <div key={g.label}>
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-graphite-400 dark:text-graphite-500">
                {g.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {g.items.map((i) => {
                const active = isActive(i.href, i.exact);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      title={collapsed ? i.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-cyan/10 text-cyan dark:text-cyan"
                          : "text-graphite-600 dark:text-graphite-300 hover:bg-graphite-100 dark:hover:bg-graphite-900 hover:text-graphite-900 dark:hover:text-white"
                      } ${collapsed ? "justify-center px-0" : ""}`}
                    >
                      <span className={`shrink-0 ${active ? "text-cyan" : ""}`}>{i.icon}</span>
                      {!collapsed && <span className="truncate">{i.label}</span>}
                      {!collapsed && active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan" aria-hidden="true" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* footer: help + dropbox + theme + user */}
      <div className="shrink-0 border-t border-graphite-100 dark:border-graphite-900 p-2 space-y-2">
        {!collapsed && (
          <div className="rounded-lg bg-gradient-to-br from-cyan/10 via-violet-500/5 to-transparent border border-graphite-200 dark:border-graphite-800 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-graphite-900 dark:text-white">
              <span className="text-cyan">{I.help}</span>
              Need help?
            </div>
            <p className="mt-1 text-[11px] leading-snug text-graphite-500 dark:text-graphite-400">
              Stuck on a job or preset? Ping Mike.
            </p>
            <a
              href="mailto:mike@athmedia.co"
              className="mt-2 inline-flex text-[11px] font-semibold text-cyan hover:underline"
            >
              Contact support →
            </a>
          </div>
        )}

        {!collapsed && (
          <div className="px-2 flex items-center justify-end">
            <DarkModeToggle />
          </div>
        )}
        {collapsed && (
          <div className="flex flex-col items-center gap-1">
            <DarkModeToggle />
          </div>
        )}

        {/* user row */}
        {session?.user && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserOpen((v) => !v)}
              className={`w-full flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-graphite-100 dark:hover:bg-graphite-900 transition-colors ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <span className="w-8 h-8 rounded-full bg-graphite-900 dark:bg-white text-white dark:text-graphite-900 text-xs font-semibold flex items-center justify-center shrink-0">
                {(session.user.name?.[0] ?? session.user.email?.[0] ?? "?").toUpperCase()}
              </span>
              {!collapsed && (
                <span className="flex-1 min-w-0 text-left">
                  <span className="block text-xs font-medium text-graphite-900 dark:text-white truncate">
                    {session.user.name || session.user.email}
                  </span>
                  <span className="block text-[10px] text-graphite-500 dark:text-graphite-400 truncate">
                    {session.user.role || "user"}
                  </span>
                </span>
              )}
            </button>
            {userOpen && (
              <div className="absolute bottom-full mb-2 left-2 right-2 rounded-xl border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-950 shadow-xl p-1 text-sm z-50">
                <Link
                  href="/settings"
                  onClick={() => setUserOpen(false)}
                  className="block rounded-md px-3 py-2 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-900"
                >
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="w-full text-left rounded-md px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
