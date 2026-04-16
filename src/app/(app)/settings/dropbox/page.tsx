import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppNav } from "@/components/layout/app-nav";
import { DropboxTokensPanel } from "@/components/settings/dropbox-tokens";
import { testConnection } from "@/lib/dropbox";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  refresh_token?: string;
  access_token?: string;
  error?: string;
}>;

export default async function DropboxSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const isAdmin = session.user.role === "admin";
  if (!isAdmin) redirect("/jobs");

  const sp = await searchParams;
  const refreshToken = sp.refresh_token ?? null;
  const accessToken = sp.access_token ?? null;
  const oauthError = sp.error ?? null;

  const status = await probeDropbox();
  const appConfigured = !!process.env.DROPBOX_APP_KEY && !!process.env.DROPBOX_APP_SECRET;

  return (
    <main className="min-h-screen bg-graphite-950 text-white">
      <AppNav active="settings" isAdmin={isAdmin} />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-10 pb-16 space-y-8">
        <section>
          <div className="text-[11px] uppercase tracking-[0.25em] text-graphite-500 mb-3">
            Settings
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.02]">
            <span className="text-white">Dropbox</span>
            <span className="text-cyan">.</span>
          </h1>
          <p className="mt-4 text-[15px] text-graphite-400 max-w-2xl">
            Dropbox access tokens expire after four hours. Connect once here to get a long-lived
            refresh token that auto-rotates forever.
          </p>
        </section>

        <div className="rounded-3xl bg-graphite-900 border border-graphite-800 p-6 sm:p-8 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-graphite-500 mb-1">
                Current status
              </div>
              {status.ok ? (
                <div>
                  <div className="text-lg text-white font-medium">Connected</div>
                  <div className="text-sm text-graphite-400">
                    {status.name} · {status.email}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-lg text-amber-300 font-medium">Disconnected</div>
                  <div className="text-sm text-graphite-400">{status.reason}</div>
                </div>
              )}
            </div>
            {appConfigured ? (
              <Link
                href="/api/dropbox/auth-url"
                className="h-11 px-5 rounded-xl bg-cyan text-graphite-950 text-sm font-semibold hover:bg-cyan-400 transition shadow-lg shadow-cyan/20 inline-flex items-center"
              >
                {status.ok ? "Reconnect Dropbox" : "Connect Dropbox"}
              </Link>
            ) : (
              <div className="text-xs text-amber-300 max-w-xs text-right">
                Set DROPBOX_APP_KEY and DROPBOX_APP_SECRET in env first.
              </div>
            )}
          </div>
        </div>

        {(refreshToken || oauthError) && (
          <div className="rounded-3xl bg-graphite-900 border border-graphite-800 p-6 sm:p-8">
            <DropboxTokensPanel
              refreshToken={refreshToken}
              accessToken={accessToken}
              error={oauthError}
            />
          </div>
        )}
      </div>
    </main>
  );
}

async function probeDropbox(): Promise<
  { ok: true; name: string; email: string } | { ok: false; reason: string }
> {
  try {
    const r = await testConnection();
    return { ok: true, name: r.name, email: r.email };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return { ok: false, reason: shortMessage(msg) };
  }
}

function shortMessage(raw: string): string {
  // Dropbox errors can be huge JSON blobs — keep it readable in UI.
  if (raw.includes("expired_access_token")) return "Access token expired — connect below to refresh.";
  if (raw.includes("invalid_access_token")) return "Access token invalid — connect below to refresh.";
  if (raw.length > 200) return raw.slice(0, 200) + "…";
  return raw;
}
