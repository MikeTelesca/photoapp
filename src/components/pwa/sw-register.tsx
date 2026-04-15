"use client";
import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Check for updates every 5 min
      const checkInterval = setInterval(() => reg.update().catch(() => {}), 5 * 60 * 1000);

      // Listen for new SW waiting
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New version is ready
            window.dispatchEvent(new CustomEvent("sw-update-available"));
          }
        });
      });
    }).catch((err) => {
      console.error("SW registration failed:", err);
    });

    // Listen for messages from active SW
    function onMessage(event: MessageEvent) {
      if (event.data?.type === "NEW_VERSION_INSTALLED") {
        window.dispatchEvent(new CustomEvent("sw-update-available"));
      }
    }
    navigator.serviceWorker.addEventListener("message", onMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);
  return null;
}
