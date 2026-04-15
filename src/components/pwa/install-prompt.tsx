"use client";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("pwa-install-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const result = await deferred.userChoice;
    if (result.outcome === "accepted") {
      setVisible(false);
    }
    setDeferred(null);
  }

  function dismiss() {
    localStorage.setItem("pwa-install-dismissed", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-700 rounded-lg shadow-xl p-4 max-w-sm">
      <div className="flex items-start gap-3">
        <div className="text-2xl">📱</div>
        <div className="flex-1">
          <div className="text-sm font-semibold dark:text-white">Install PhotoApp</div>
          <div className="text-xs text-graphite-500 dark:text-graphite-400 mt-1">
            Install as an app for faster access and offline features.
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={install}
              className="text-xs px-3 py-1.5 rounded bg-cyan-500 text-white font-semibold hover:bg-cyan-600 transition"
            >
              Install
            </button>
            <button
              onClick={dismiss}
              className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800 transition"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
