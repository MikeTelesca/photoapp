import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const auth = await requireUser();
  if ("error" in auth) redirect("/login");

  const records = await prisma.loginRecord
    .findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    .catch(() => []);

  return (
    <>
      <Topbar title="Recent sign-ins" />
      <div className="p-6">
        <Card>
          <div className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-sm font-semibold dark:text-white">
                  Recent sign-in activity
                </h2>
                <p className="text-xs text-graphite-500 dark:text-graphite-400 mt-1">
                  Last 20 sign-ins to your account. If you see something
                  unfamiliar, change your password immediately.
                </p>
              </div>
            </div>
            {records.length === 0 ? (
              <div className="text-center py-8 text-sm text-graphite-400">
                No sign-in records yet
              </div>
            ) : (
              <ul className="space-y-1">
                {records.map((r) => (
                  <li
                    key={r.id}
                    className="flex justify-between py-2 border-b border-graphite-50 dark:border-graphite-800 last:border-b-0 text-sm"
                  >
                    <div>
                      <div className="dark:text-white">
                        {r.userAgent
                          ? parseUserAgent(r.userAgent)
                          : "Unknown device"}
                      </div>
                      <div className="text-xs text-graphite-400">
                        {r.ipAddress || "IP not recorded"}
                      </div>
                    </div>
                    <div className="text-xs text-graphite-400">
                      {r.createdAt.toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function parseUserAgent(ua: string): string {
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Web";
}
