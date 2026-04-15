"use client";
export function RestartTourButton() {
  return (
    <button
      onClick={() => {
        localStorage.removeItem("onboarding-dismissed");
        window.location.href = "/";
      }}
      className="text-xs px-3 py-1.5 rounded border border-graphite-200 dark:border-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800"
    >
      Restart onboarding tour
    </button>
  );
}
