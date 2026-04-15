import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Topbar } from "@/components/layout/topbar";
import { StatusSnippetsForm } from "@/components/settings/status-snippets-form";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "processing", "review", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];
export type StatusSnippetMap = Record<Status, string[]>;

function parseSnippets(raw: string | null | undefined): StatusSnippetMap {
  const empty: StatusSnippetMap = {
    pending: [],
    processing: [],
    review: [],
    approved: [],
    rejected: [],
  };
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: StatusSnippetMap = { ...empty };
    for (const key of STATUSES) {
      const v = parsed[key];
      if (Array.isArray(v)) {
        out[key] = v.filter((s): s is string => typeof s === "string");
      }
    }
    return out;
  } catch {
    return empty;
  }
}

export default async function StatusSnippetsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { statusSnippets: true },
  });

  const initial = parseSnippets(user?.statusSnippets);

  return (
    <>
      <Topbar title="Quick note snippets" subtitle="Per-status text snippets to paste into job notes" />
      <div className="p-6 max-w-3xl space-y-4">
        <div className="text-xs text-graphite-500 dark:text-graphite-400">
          Snippets appear as a 💬 Snippets dropdown on jobs whose current status matches. Use them for reusable
          status-specific notes (e.g. &quot;Awaiting client assets&quot; on pending, &quot;Sent for final approval&quot; on review).
        </div>
        <StatusSnippetsForm initial={initial} />
      </div>
    </>
  );
}
