"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function ImpersonateButton({ userId, userName }: { userId: string; userName: string }) {
  const { update } = useSession();
  const router = useRouter();

  async function start() {
    if (!confirm(`View as ${userName}?`)) return;
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      await update({ impersonatedUserId: userId });
      router.push("/");
    }
  }

  return (
    <button
      onClick={start}
      className="text-xs px-2 py-1 rounded bg-purple-500 text-white hover:bg-purple-600"
    >
      View as
    </button>
  );
}
