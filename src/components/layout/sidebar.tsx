"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Squares2X2Icon,
  EyeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  PaintBrushIcon,
  UsersIcon,
  Cog6ToothIcon,
  CameraIcon,
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

  return (
    <aside className="w-[230px] bg-white border-r border-graphite-200 flex flex-col fixed top-0 left-0 bottom-0 z-20">
      <div className="px-6 py-6 mb-2 flex items-center gap-2.5">
        <div className="w-[34px] h-[34px] bg-gradient-to-br from-graphite-900 to-graphite-700 rounded-[10px] flex items-center justify-center shadow-md">
          <CameraIcon className="w-[18px] h-[18px] text-white" />
        </div>
        <span className="text-[17px] font-bold text-graphite-900 tracking-tight">PhotoApp</span>
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
        <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-cyan to-cyan-light flex items-center justify-center text-[13px] font-bold text-white">A</div>
        <div>
          <div className="text-[13px] font-semibold text-graphite-900">Admin</div>
          <div className="text-[11px] text-graphite-400">aroundthehouse</div>
        </div>
      </div>
    </aside>
  );
}
