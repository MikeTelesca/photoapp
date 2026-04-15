"use client";

import { useSidebar } from "./sidebar-context";
import { ReactNode } from "react";

export function MainContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <main className={`flex-1 ${collapsed ? "md:ml-[60px]" : "md:ml-[230px]"} pt-14 md:pt-0 transition-all duration-300`}>
      {children}
    </main>
  );
}
