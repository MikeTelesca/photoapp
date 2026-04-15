"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function QuickAddFab() {
  const pathname = usePathname();

  // Hide on the new job page itself
  if (pathname === "/jobs/new") return null;
  // Hide on share/auth pages (they have their own layouts but defensive check)
  if (pathname?.startsWith("/share/") || pathname?.startsWith("/login") || pathname?.startsWith("/signup")) return null;

  return (
    <Link
      href="/jobs/new"
      className="fixed z-30 bottom-20 right-4 md:bottom-6 md:right-6 w-12 h-12 md:w-14 md:h-14 rounded-full bg-cyan text-white flex items-center justify-center shadow-lg hover:bg-cyan-600 active:scale-95 transition-all"
      aria-label="Create new job"
      title="New job (⌘N)"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m6-6H6" />
      </svg>
    </Link>
  );
}
