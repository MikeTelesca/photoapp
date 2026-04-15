"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme-provider";
import { AccentProvider } from "@/components/theme/accent-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
          <ToastProvider>
            <AccentProvider />
            {children}
          </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
