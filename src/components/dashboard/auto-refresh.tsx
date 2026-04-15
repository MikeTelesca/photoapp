"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function AutoRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      // Stop polling after 30 min to avoid forever-polls
      if (Date.now() - startTime.current > 30 * 60 * 1000) {
        clearInterval(interval);
        return;
      }
      router.refresh();
    }, 15000);

    return () => clearInterval(interval);
  }, [enabled, router]);

  return null;
}
