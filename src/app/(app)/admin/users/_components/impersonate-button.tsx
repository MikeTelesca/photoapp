"use client";
import { useRouter } from "next/navigation";

export function ImpersonateButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();

  async function start() {
    if (!confirm(`Impersonate ${userName}? Every action will be logged.`)) return;
    const res = await fetch(`/api/admin/impersonate/${userId}`, {
      method: "POST",
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const msg = await res.text();
      alert(`Impersonation failed: ${msg}`);
    }
  }

  return (
    <button
      onClick={start}
      className="text-xs px-2 py-1 rounded bg-purple-500 text-white hover:bg-purple-600"
      title="Impersonate this user"
    >
      🕵 Impersonate
    </button>
  );
}
