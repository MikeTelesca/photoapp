"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Squares2X2Icon,
  EyeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  PaintBrushIcon,
  UsersIcon,
  Cog6ToothIcon,
  CameraIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: Squares2X2Icon },
  { label: "Needs Review", href: "/dashboard?filter=review", icon: EyeIcon, badge: 5 },
  { label: "Processing", href: "/dashboard?filter=processing", icon: ArrowPathIcon },
  { label: "Completed", href: "/dashboard?filter=approved", icon: CheckCircleIcon },
];

const settingsItems = [
  { label: "Presets", href: "/presets", icon: PaintBrushIcon },
  { label: "Photographers", href: "/photographers", icon: UsersIcon },
  { label: "Settings", href: "/settings", icon: Cog6ToothIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="px-6 py-6 mb-2 flex items-center gap-2.5">
        <div className="w-[34px] h-[34px] bg-gradient-to-br from-graphite-900 to-graphite-700 rounded-[10px] flex items-center justify-center shadow-md">
          <CameraIcon className="w-[18px] h-[18px] text-white" />
        </div>
        <span className="text-[17px] font-bold text-graphite-900 tracking-tight">PhotoApp</span>
        {/* Close button on mobile */}
        <button
          onClick={() => setIsOpen(false)}
          className="ml-auto md:hidden p-1 text-graphite-400 hover:text-graphite-600"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <nav className="mb-7">
        <div className="px-6 mb-2 text-[10px] font-bold text-graphite-400 uppercase tracking-widest">Menu</div>
        {menuItems.map((item) => {
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard" && !item.badge
            : pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-2.5 px-6 py-2 mx-2.5 rounded-[10px] text-[13.5px] font-medium transition-all duration-150 ${
                isActive
                  ? "bg-gradient-to-br from-graphite-900 to-graphite-800 text-white shadow-md"
                  : "text-graphite-500 hover:bg-graphite-100 hover:text-graphite-700"
              }`}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {item.label}
              {item.badge && (
                <span className="ml-auto bg-cyan text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <nav className="mb-7">
        <div className="px-6 mb-2 text-[10px] font-bold text-graphite-400 uppercase tracking-widest">Settings</div>
        {settingsItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-2.5 px-6 py-2 mx-2.5 rounded-[10px] text-[13.5px] font-medium transition-all duration-150 ${
                isActive
                  ? "bg-gradient-to-br from-graphite-900 to-graphite-800 text-white shadow-md"
                  : "text-graphite-500 hover:bg-graphite-100 hover:text-graphite-700"
              }`}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="px-6 py-4 border-t border-graphite-200 flex items-center gap-2.5">
        <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-cyan to-cyan-light flex items-center justify-center text-[13px] font-bold text-white">
          {session?.user?.name?.charAt(0) || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-graphite-900 truncate">
            {session?.user?.name || "User"}
          </div>
          <div className="text-[11px] text-graphite-400 truncate">
            {session?.user?.email || ""}
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-graphite-400 hover:text-graphite-600 transition-colors"
          title="Sign out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header - shows only on small screens */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-graphite-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsOpen(true)} className="p-1">
            <Bars3Icon className="w-6 h-6 text-graphite-700" />
          </button>
          <span className="text-base font-bold text-graphite-900">PhotoApp</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-[230px] md:fixed md:top-0 md:left-0 md:bottom-0 bg-white border-r border-graphite-200 flex-col z-20">
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
          <aside className="relative w-[270px] bg-white flex flex-col z-10 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
