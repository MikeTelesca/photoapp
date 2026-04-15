import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { StopImpersonatingButton } from "./stop-impersonating-button";

/**
 * Server component banner shown when cookie-based admin impersonation is active.
 * Reads the `ath-impersonate` cookie and looks up the impersonated user for
 * display. Renders nothing if no impersonation is active or the cookie refers
 * to a missing user.
 */
export async function ImpersonateBanner() {
  const cookieStore = await cookies();
  const impersonatedId = cookieStore.get("ath-impersonate")?.value;
  if (!impersonatedId) return null;

  // Only show if the real session user is actually an admin — avoids leaking
  // a stale cookie from a downgraded account.
  const session = await auth();
  const realRole = session?.user?.role;
  // During impersonation, api-auth swaps session.user.role to the target; use
  // actualUserId to detect that we're mid-impersonation from a server call.
  const isAdminActual =
    realRole === "admin" ||
    session?.actualUserId !== undefined ||
    session?.impersonating === true;
  if (!isAdminActual) return null;

  const target = await prisma.user.findUnique({
    where: { id: impersonatedId },
    select: { id: true, name: true, email: true },
  });
  if (!target) return null;

  const label = target.name || target.email || target.id;

  return (
    <div className="bg-purple-600 text-white text-xs px-4 py-2 flex justify-between items-center z-50">
      <span>
        Impersonating {label} (admin support view)
      </span>
      <StopImpersonatingButton />
    </div>
  );
}
