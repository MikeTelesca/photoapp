"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { shortcutsDisabled } from "@/lib/keyboard-shortcuts";

export function useGlobalShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (shortcutsDisabled()) return;

      // Don't fire while typing in inputs
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }

      // Cmd/Ctrl + N → new job
      if ((e.metaKey || e.ctrlKey) && e.key === "n" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        router.push("/jobs/new");
      }

      // Cmd/Ctrl + , → settings
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        router.push("/settings");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
}
