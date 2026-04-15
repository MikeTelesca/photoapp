import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { MaintenanceActions } from "@/components/settings/maintenance-actions";
import { AccountForm } from "@/components/settings/account-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  const dropboxRefreshToken = !!process.env.DROPBOX_REFRESH_TOKEN;
  const dropboxConnected = dropboxRefreshToken || !!process.env.DROPBOX_ACCESS_TOKEN;
  const geminiConnected = !!process.env.GOOGLE_AI_API_KEY;

  return (
    <>
      <Topbar title="Settings" subtitle="App configuration and connections" />
      <div className="p-6 max-w-3xl space-y-4">
        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <div className="p-5">
            <AccountForm
              initialName={session?.user?.name || ""}
              email={session?.user?.email || ""}
              role={(session?.user as any)?.role || ""}
            />
          </div>
        </Card>

        {/* Connected Services */}
        <Card>
          <CardHeader>
            <CardTitle>Connected Services</CardTitle>
          </CardHeader>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L6 7l6 5-6 5 6 5 6-5-6-5 6-5z"/></svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-graphite-900">Dropbox</div>
                  <div className="text-xs text-graphite-400">Photo intake and storage</div>
                </div>
              </div>
              {dropboxConnected ? (
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span className="text-xs font-semibold">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-red-500">
                    <ExclamationCircleIcon className="w-4 h-4" />
                    <span className="text-xs font-semibold">Not configured</span>
                  </div>
                  <a href="/api/auth/dropbox" className="text-xs font-semibold text-cyan-600 hover:underline">
                    Connect Dropbox
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-graphite-900">Google Gemini AI</div>
                  <div className="text-xs text-graphite-400">Photo enhancement engine</div>
                </div>
              </div>
              {geminiConnected ? (
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span className="text-xs font-semibold">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-500">
                  <ExclamationCircleIcon className="w-4 h-4" />
                  <span className="text-xs font-semibold">Not configured</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Maintenance — admin only */}
        {userRole === "admin" && (
          <Card>
            <CardHeader>
              <CardTitle>Maintenance</CardTitle>
            </CardHeader>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-semibold text-graphite-900">Stuck Photo Recovery</div>
                  <div className="text-xs text-graphite-400">Reset photos stuck in &ldquo;processing&rdquo; for more than 5 minutes back to pending</div>
                </div>
                <MaintenanceActions />
              </div>
            </div>
          </Card>
        )}

        {/* App Info */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <div className="p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-graphite-500">App</span>
              <span className="text-sm font-semibold text-graphite-900">PhotoApp v1.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-graphite-500">AI Engine</span>
              <span className="text-sm font-semibold text-graphite-900">Gemini 2.0 Flash</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-graphite-500">Database</span>
              <span className="text-sm font-semibold text-graphite-900">Neon Postgres</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-graphite-500">Hosting</span>
              <span className="text-sm font-semibold text-graphite-900">Vercel</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
