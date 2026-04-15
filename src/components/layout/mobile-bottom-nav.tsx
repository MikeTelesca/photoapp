"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

const links = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon },
  { href: "/jobs/new", label: "New", Icon: PlusCircleIcon },
  { href: "/search", label: "Search", Icon: MagnifyingGlassIcon },
  { href: "/help", label: "Help", Icon: QuestionMarkCircleIcon },
  { href: "/settings", label: "Settings", Icon: Cog6ToothIcon },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 z-40 pb-safe">
      <div className="flex justify-around items-center h-14">
        {links.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 ${
                active
                  ? "text-cyan-500"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
