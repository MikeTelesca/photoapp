"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();

  if (!session?.impersonating) return null;

  async function stop() {
    await update({ impersonatedUserId: null });
    router.push("/admin/users");
    router.refresh();
  }

  return (
    <div className="bg-purple-600 text-white text-xs px-4 py-2 flex justify-between items-center z-50">
      <span>
        ⚠ Viewing as {session.user?.name || session.user?.email} (admin impersonation active)
      </span>
      <button onClick={stop} className="underline font-semibold">
        Stop impersonating
      </button>
    </div>
  );
}
