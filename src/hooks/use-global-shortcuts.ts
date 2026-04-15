"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { shortcutsDisabled } from "@/lib/keyboard-shortcuts";

export function useGlobalShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (shortcutsDisabled()) return;

      // Cmd/Ctrl + S → trigger save in active form
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        // Allow Cmd+S in textarea (don't block default save)
        const target = e.target as HTMLElement;
        if (target?.tagName === "TEXTAREA") return;

        // Find a button with data-save in the active form
        const activeEl = document.activeElement as HTMLElement;
        const form = activeEl?.closest?.("form, [data-save-region]") as HTMLElement | null;

        let saveBtn: HTMLButtonElement | null = null;
        if (form) {
          saveBtn = form.querySelector('button[data-save], button[type="submit"]') as HTMLButtonElement | null;
        }

        if (!saveBtn) {
          // Fallback: find any visible button labeled "Save", "Create", or "Update" on the page
          const buttons = Array.from(document.querySelectorAll("button"));
          saveBtn = buttons.find(
            (b) =>
              /^(save|create|update)$/i.test(b.textContent?.trim() || "") &&
              !b.disabled &&
              b.offsetParent !== null // visible check
          ) as HTMLButtonElement | null;
        }

        if (saveBtn) {
          e.preventDefault();
          saveBtn.click();
        }
      }

      // Don't fire while typing in inputs (except for Cmd+S which we handle above)
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
