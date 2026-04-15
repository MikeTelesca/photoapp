"use client";

export function StopImpersonatingButton() {
  async function stop() {
    await fetch("/api/admin/impersonate/stop", { method: "POST" });
    window.location.reload();
  }

  return (
    <button onClick={stop} className="underline font-semibold">
      Stop impersonating
    </button>
  );
}
