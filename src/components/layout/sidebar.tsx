"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Squares2X2Icon,
  CalendarDaysIcon,
  EyeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  PaintBrushIcon,
  UsersIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  CameraIcon,
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  QuestionMarkCircleIcon,
  BookmarkIcon,
  CreditCardIcon,
  ClockIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  BeakerIcon,
  MegaphoneIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "@/components/theme-provider";
import { useSidebar } from "@/components/layout/sidebar-context";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { SidebarSearch } from "@/components/layout/sidebar-search";
import { SidebarBadge } from "@/components/layout/sidebar-badge";

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: Squares2X2Icon },
  { label: "Calendar", href: "/calendar", icon: CalendarDaysIcon },
  { label: "Search", href: "/search", icon: MagnifyingGlassIcon },
  { label: "Needs Review", href: "/dashboard?filter=review", icon: EyeIcon },
  { label: "Processing", href: "/dashboard?filter=processing", icon: ArrowPathIcon },
  { label: "Completed", href: "/dashboard?filter=approved", icon: CheckCircleIcon },
  { label: "Templates", href: "/templates", icon: BookmarkIcon },
  { label: "Playground", href: "/playground", icon: BeakerIcon },
  { label: "Clients", href: "/clients", icon: UserGroupIcon },
];

const settingsItems = [
  { label: "Analytics", href: "/analytics", icon: ChartBarIcon },
  { label: "Activity", href: "/activity", icon: ClockIcon },
  { label: "Billing", href: "/billing", icon: CreditCardIcon },
  { label: "Users", href: "/admin/users", icon: UsersIcon },
  { label: "Presets", href: "/presets", icon: PaintBrushIcon },
  { label: "Photographers", href: "/photographers", icon: UsersIcon },
  { label: "Feature Flags", href: "/admin/flags", icon: AdjustmentsHorizontalIcon },
  { label: "Announcements", href: "/admin/announcements", icon: MegaphoneIcon },
  { label: "Errors", href: "/admin/errors", icon: ExclamationTriangleIcon },
  { label: "Health", href: "/admin/health", icon: HeartIcon },
  { label: "Settings", href: "/settings", icon: Cog6ToothIcon },
  { label: "🎨 Portfolio", href: "/settings/portfolio", icon: Cog6ToothIcon },
];

const helpItems = [
  { label: "What's new", href: "/whats-new", icon: SparklesIcon },
  { label: "Help", href: "/help", icon: QuestionMarkCircleIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [needsReviewCount, setNeedsReviewCount] = useState<number | null>(null);
  const { theme, setTheme } = useTheme();
  const { collapsed, toggle } = useSidebar();

  useEffect(() => {
    const fetchCount = () => {
      fetch("/api/stats")
        .then(r => r.json())
        .then(data => setNeedsReviewCount(data.reviewJobs ?? null))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Every 30s
    return () => clearInterval(interval);
  }, []);

  const sidebarContent = (
    <>
      <div className={`py-6 mb-2 flex items-center gap-2.5 ${collapsed ? "px-3 justify-center" : "px-6"}`}>
        <div className="w-[34px] h-[34px] flex-shrink-0 bg-gradient-to-br from-graphite-900 to-graphite-700 rounded-[10px] flex items-center justify-center shadow-md">
          <CameraIcon className="w-[18px] h-[18px] text-white" />
        </div>
        {!collapsed && (
          <span className="text-[17px] font-bold text-graphite-900 dark:text-white tracking-tight">PhotoApp</span>
        )}
        {/* Close button on mobile */}
        <button
          onClick={() => setIsOpen(false)}
          aria-label="Close navigation menu"
          className="ml-auto md:hidden p-1 text-graphite-400 hover:text-graphite-600 dark:hover:text-graphite-300"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
        {/* Collapse toggle — desktop only */}
        {!collapsed && (
          <button
            onClick={toggle}
            aria-label="Collapse sidebar"
            className="hidden md:flex ml-auto p-1 text-graphite-400 hover:text-graphite-600 dark:hover:text-graphite-300 transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      {/* Expand button when collapsed — desktop only */}
      {collapsed && (
        <button
          onClick={toggle}
          aria-label="Expand sidebar"
          className="hidden md:flex items-center justify-center w-full py-1.5 mb-2 text-graphite-400 hover:text-graphite-600 dark:hover:text-graphite-300 transition-colors"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      )}


      {!collapsed && <SidebarSearch />}
      <nav className="mb-7">
        {!collapsed && <div className="px-6 mb-2 text-[10px] font-bold text-graphite-400 uppercase tracking-widest">Menu</div>}
        {menuItems.map((item) => {
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setIsOpen(false)}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-2.5 py-2 mx-2.5 rounded-[10px] text-[13.5px] font-medium transition-all duration-150 ${
                collapsed ? "px-3 justify-center" : "px-6"
              } ${
                isActive
                  ? "bg-gradient-to-br from-graphite-900 to-graphite-800 text-white shadow-md"
                  : "text-graphite-500 dark:text-graphite-400 hover:bg-graphite-100 dark:hover:bg-graphite-800 hover:text-graphite-700 dark:hover:text-graphite-200"
              }`}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && item.label}
              {!collapsed && item.label === "Dashboard" && (
                <SidebarBadge endpoint="/api/jobs/inbox-count" countKey="count" />
              )}
              {!collapsed && item.label === "Needs Review" && needsReviewCount !== null && needsReviewCount > 0 && (
                <span className="ml-auto bg-cyan text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {needsReviewCount}
                </span>
              )}
              {collapsed && item.label === "Needs Review" && needsReviewCount !== null && needsReviewCount > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-cyan rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {session?.user?.role === "admin" && (
        <nav className="mb-7">
          {!collapsed && <div className="px-6 mb-2 text-[10px] font-bold text-graphite-400 uppercase tracking-widest">Settings</div>}
          {settingsItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-2.5 py-2 mx-2.5 rounded-[10px] text-[13.5px] font-medium transition-all duration-150 ${
                  collapsed ? "px-3 justify-center" : "px-6"
                } ${
                  isActive
                    ? "bg-gradient-to-br from-graphite-900 to-graphite-800 text-white shadow-md"
                    : "text-graphite-500 dark:text-graphite-400 hover:bg-graphite-100 dark:hover:bg-graphite-800 hover:text-graphite-700 dark:hover:text-graphite-200"
                }`}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>
      )}

      <nav className="mb-7">
        {!collapsed && <div className="px-6 mb-2 text-[10px] font-bold text-graphite-400 uppercase tracking-widest">Support</div>}
        {helpItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setIsOpen(false)}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-2.5 py-2 mx-2.5 rounded-[10px] text-[13.5px] font-medium transition-all duration-150 ${
                collapsed ? "px-3 justify-center" : "px-6"
              } ${
                isActive
                  ? "bg-gradient-to-br from-graphite-900 to-graphite-800 text-white shadow-md"
                  : "text-graphite-500 dark:text-graphite-400 hover:bg-graphite-100 dark:hover:bg-graphite-800 hover:text-graphite-700 dark:hover:text-graphite-200"
              }`}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Theme toggle */}
      <div className={`mb-2 ${collapsed ? "px-1 mx-1" : "px-3 mx-3"}`}>
        <div className="flex items-center justify-center gap-1 bg-graphite-100 dark:bg-graphite-800 rounded-lg p-1">
          <button
            onClick={() => setTheme("light")}
            className={`flex-1 flex items-center justify-center py-1.5 rounded transition-all ${
              theme === "light"
                ? "bg-white dark:bg-graphite-700 shadow-sm text-graphite-900 dark:text-white"
                : "text-graphite-500 dark:text-graphite-400 hover:text-graphite-700 dark:hover:text-graphite-200"
            }`}
            title="Light mode"
            aria-label="Switch to light mode"
          >
            <SunIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`flex-1 flex items-center justify-center py-1.5 rounded transition-all ${
              theme === "dark"
                ? "bg-graphite-700 text-white shadow-sm"
                : "text-graphite-500 dark:text-graphite-400 hover:text-graphite-700 dark:hover:text-graphite-200"
            }`}
            title="Dark mode"
            aria-label="Switch to dark mode"
          >
            <MoonIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme("system")}
            className={`flex-1 flex items-center justify-center py-1.5 rounded transition-all ${
              theme === "system"
                ? "bg-white dark:bg-graphite-700 shadow-sm text-graphite-900 dark:text-white"
                : "text-graphite-500 dark:text-graphite-400 hover:text-graphite-700 dark:hover:text-graphite-200"
            }`}
            title="System default"
            aria-label="Use system theme"
          >
            <ComputerDesktopIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className={`py-4 border-t border-graphite-200 dark:border-graphite-800 flex items-center gap-2.5 ${collapsed ? "px-3 justify-center flex-col" : "px-6"}`}>
        <div className="w-[34px] h-[34px] flex-shrink-0 rounded-full bg-gradient-to-br from-cyan to-cyan-light flex items-center justify-center text-[13px] font-bold text-white" title={collapsed ? (session?.user?.name || "User") : undefined}>
          {session?.user?.name?.charAt(0) || "?"}
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-graphite-900 dark:text-white truncate">
                {session?.user?.name || "User"}
              </div>
              <div className="text-[11px] text-graphite-400 truncate">
                {session?.user?.email || ""}
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-graphite-400 hover:text-graphite-600 dark:hover:text-graphite-300 transition-colors"
              title="Sign out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </>
        )}
        {collapsed && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-graphite-400 hover:text-graphite-600 dark:hover:text-graphite-300 transition-colors"
            title="Sign out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header - shows only on small screens */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-graphite-900 border-b border-graphite-200 dark:border-graphite-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsOpen(true)} aria-label="Open navigation menu" className="p-1">
            <Bars3Icon className="w-6 h-6 text-graphite-700 dark:text-graphite-300" />
          </button>
          <span className="text-base font-bold text-graphite-900 dark:text-white">PhotoApp</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex md:fixed md:top-0 md:left-0 md:bottom-0 bg-white dark:bg-graphite-900 border-r border-graphite-200 dark:border-graphite-800 flex-col z-20 transition-all duration-300 ${collapsed ? "md:w-[60px]" : "md:w-[230px]"}`}>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setIsOpen(false)}
          />
          {/* Sidebar panel */}
          <aside className="relative w-[270px] bg-white dark:bg-graphite-900 flex flex-col z-10 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
