"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { DarkModeToggle } from "@/components/layout/dark-mode-toggle";

type NavItem = {
  label: string;
  href: string;
  desc?: string;
  adminOnly?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

const groups: Record<string, NavGroup> = {
  Jobs: {
    label: "Jobs",
    items: [
      { label: "Dashboard", href: "/dashboard", desc: "All active jobs" },
      { label: "Needs review", href: "/dashboard?status=review", desc: "Waiting on you" },
      { label: "Processing", href: "/dashboard?status=processing", desc: "AI working" },
      { label: "Completed", href: "/dashboard?status=approved", desc: "Delivered" },
      { label: "Templates", href: "/templates", desc: "Reusable job presets" },
      { label: "Calendar", href: "/calendar", desc: "Jobs by date" },
      { label: "Trash", href: "/trash", desc: "Recover deleted" },
    ],
  },
  Tools: {
    label: "Tools",
    items: [
      { label: "Presets", href: "/presets", desc: "Editing style library" },
      { label: "Playground", href: "/playground", desc: "Test prompts on one photo" },
      { label: "Search", href: "/search", desc: "Find any job or photo" },
    ],
  },
  Admin: {
    label: "Admin",
    items: [
      { label: "Users", href: "/admin/users", desc: "Manage accounts", adminOnly: true },
      { label: "Photographers", href: "/photographers", desc: "Team roster", adminOnly: true },
      { label: "Analytics", href: "/analytics", desc: "Usage and cost trends", adminOnly: true },
      { label: "Activity", href: "/activity", desc: "Recent actions", adminOnly: true },
      { label: "Billing", href: "/billing", desc: "Invoices and costs" },
    ],
  },
};

export function TopNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => setOpen(null), [pathname]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  function groupItems(name: string) {
    const items = groups[name].items;
    return name === "Admin" ? items.filter((i) => !i.adminOnly || isAdmin) : items;
  }

  const triggers: Array<{ key: string; label: string; dropdown?: true; href?: string }> = [
    { key: "Jobs", label: "Jobs", dropdown: true },
    { key: "Clients", label: "Clients", href: "/clients" },
    { key: "Tools", label: "Tools", dropdown: true },
    ...(isAdmin ? [{ key: "Admin", label: "Admin", dropdown: true as const }] : []),
    { key: "Settings", label: "Settings", href: "/settings" },
  ];

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-40 w-full bg-white/90 dark:bg-graphite-950/90 backdrop-blur border-b border-graphite-200 dark:border-graphite-800"
    >
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-4 md:gap-6">
        <Link
          href="/dashboard"
          className="font-semibold text-[18px] tracking-[-0.05em] hover:opacity-80 transition-opacity whitespace-nowrap"
        >
          <span className="text-graphite-900 dark:text-white">Batch</span><span className="text-cyan">Base</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {triggers.map((t) => {
            if (t.dropdown) {
              const active = open === t.key;
              return (
                <div key={t.key} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpen(active ? null : t.key)}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
                      active
                        ? "bg-graphite-100 dark:bg-graphite-800 text-graphite-900 dark:text-white"
                        : "text-graphite-600 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-900 hover:text-graphite-900 dark:hover:text-white"
                    }`}
                  >
                    {t.label}
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      className={`transition-transform ${active ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    >
                      <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    </svg>
                  </button>
                  {active && (
                    <div className="absolute left-0 mt-2 min-w-[280px] rounded-xl border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-950 shadow-xl p-2">
                      {groupItems(t.key).map((i) => (
                        <Link
                          key={i.href}
                          href={i.href}
                          className="block rounded-lg px-3 py-2 hover:bg-graphite-50 dark:hover:bg-graphite-900"
                        >
                          <span className="block text-sm font-medium text-graphite-900 dark:text-white">
                            {i.label}
                          </span>
                          {i.desc && (
                            <span className="block text-xs text-graphite-500 dark:text-graphite-400 mt-0.5">
                              {i.desc}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            const isCurrent = pathname === t.href || pathname?.startsWith(t.href + "/");
            return (
              <Link
                key={t.key}
                href={t.href!}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  isCurrent
                    ? "bg-graphite-100 dark:bg-graphite-800 text-graphite-900 dark:text-white"
                    : "text-graphite-600 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-900 hover:text-graphite-900 dark:hover:text-white"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <DarkModeToggle />
          <Link
            href="/jobs/new"
            className="hidden md:inline-flex px-3 py-1.5 rounded-md bg-graphite-900 dark:bg-white text-white dark:text-graphite-900 font-medium hover:bg-graphite-800 dark:hover:bg-graphite-100 transition-colors"
          >
            New job
          </Link>
          {session?.user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen(open === "user" ? null : "user")}
                className="w-8 h-8 rounded-full bg-graphite-200 dark:bg-graphite-800 text-xs font-semibold text-graphite-700 dark:text-graphite-200 flex items-center justify-center hover:bg-graphite-300 dark:hover:bg-graphite-700 transition-colors"
                title={session.user.email ?? undefined}
              >
                {(session.user.name?.[0] ?? session.user.email?.[0] ?? "?").toUpperCase()}
              </button>
              {open === "user" && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-graphite-200 dark:border-graphite-800 bg-white dark:bg-graphite-950 shadow-xl p-2 text-sm">
                  <div className="px-3 py-2 text-xs text-graphite-500 dark:text-graphite-400 truncate">
                    {session.user.email}
                  </div>
                  <Link href="/settings" className="block rounded-md px-3 py-2 text-graphite-700 dark:text-graphite-200 hover:bg-graphite-50 dark:hover:bg-graphite-900">
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
      </div>
    </header>
  );
}
