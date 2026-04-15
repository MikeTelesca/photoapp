import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { CommandLineIcon } from "@heroicons/react/24/outline";
import { auth } from "@/lib/auth";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { MaintenanceActions } from "@/components/settings/maintenance-actions";
import { AccountForm } from "@/components/settings/account-form";
import { NotificationToggle } from "@/components/settings/notification-toggle";
import { EmailNotificationToggle } from "@/components/settings/email-notification-toggle";
import { WeeklyDigestToggle } from "@/components/settings/weekly-digest-toggle";
import { InvoiceSettingsForm } from "@/components/settings/invoice-settings-form";
import { WebhookForm } from "@/components/settings/webhook-form";
import { TwoFactorForm } from "@/components/settings/two-factor-form";
import { WatermarkLogoUpload } from "@/components/settings/watermark-logo-upload";
import { AccentPicker } from "@/components/settings/accent-picker";
import { NotificationPrefs } from "@/components/settings/notification-prefs";
import { TimezonePicker } from "@/components/settings/timezone-picker";
import { SoundToggle } from "@/components/settings/sound-toggle";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  const userRole = session?.user?.role;
  const userId = session?.user?.id;

  let emailNotificationsEnabled = true;
  let weeklyDigestEnabled = true;
  let notifyJobReady = true;
  let notifyClientComment = true;
  let notifyPhotoFailed = true;
  let slackWebhookUrl: string | null = null;
  let twoFactorEnabled = false;
  let watermarkLogoPath: string | null = null;
  let userTimezone: string | null = null;
  let invoiceSettings = {
    businessName: "",
    businessEmail: "",
    businessPhone: "",
    businessAddress: "",
    invoiceRate: 50,
    invoicePrefix: "INV",
  };
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        slackWebhookUrl: true,
        emailNotifications: true,
        weeklyDigest: true,
        notifyJobReady: true,
        notifyClientComment: true,
        notifyPhotoFailed: true,
        twoFactorEnabled: true,
        businessName: true,
        businessEmail: true,
        businessPhone: true,
        businessAddress: true,
        invoiceRate: true,
        invoicePrefix: true,
        watermarkLogoPath: true,
        timezone: true,
      },
    });
    slackWebhookUrl = user?.slackWebhookUrl ?? null;
    emailNotificationsEnabled = user?.emailNotifications ?? true;
    weeklyDigestEnabled = user?.weeklyDigest ?? true;
    notifyJobReady = user?.notifyJobReady ?? true;
    notifyClientComment = user?.notifyClientComment ?? true;
    notifyPhotoFailed = user?.notifyPhotoFailed ?? true;
    twoFactorEnabled = user?.twoFactorEnabled ?? false;
    watermarkLogoPath = user?.watermarkLogoPath ?? null;
    userTimezone = user?.timezone ?? null;
    if (user) {
      invoiceSettings = {
        businessName: user.businessName ?? "",
        businessEmail: user.businessEmail ?? "",
        businessPhone: user.businessPhone ?? "",
        businessAddress: user.businessAddress ?? "",
        invoiceRate: user.invoiceRate ?? 50,
        invoicePrefix: user.invoicePrefix ?? "INV",
      };
    }
  }

  const dropboxRefreshToken = !!process.env.DROPBOX_REFRESH_TOKEN;
  const dropboxConnected = dropboxRefreshToken || !!process.env.DROPBOX_ACCESS_TOKEN;
  const geminiConnected = !!process.env.GOOGLE_AI_API_KEY;

  const isAdmin = userRole === "admin";

  return (
    <>
      <Topbar title="Settings" subtitle="App configuration and connections" />
      <div className="p-6 max-w-3xl space-y-4">
        {/* Settings Navigation Hub */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          <NavCard href="/settings/keyboard" title="Keyboard shortcuts" desc="Customize key bindings" icon="⌨️" />
          <NavCard href="/settings/sessions" title="Sessions" desc="Recent sign-in activity" icon="🔐" />
          <NavCard href="/settings/api-keys" title="API keys" desc="External integrations access" icon="🔑" />
          <NavCard href="/templates" title="Job templates" desc="Reusable job configs" icon="📋" />
          <NavCard href="/presets" title="Presets" desc="Enhancement prompt presets" icon="🎨" />
          <NavCard href="/billing" title="Billing" desc="Usage and invoices" icon="💳" />
          <NavCard href="/clients" title="Clients" desc="Client database" icon="👥" />
          <NavCard href="/activity" title="Activity log" desc="Audit trail" icon="📜" />
          <NavCard href="/whats-new" title="What's new" desc="Recent releases" icon="✨" />
        </div>

        {isAdmin && (
          <>
            <h2 className="text-xs font-semibold text-graphite-500 dark:text-graphite-400 uppercase tracking-wide mb-3 mt-2">Admin</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
              <NavCard href="/admin/users" title="Users" desc="User management" icon="👤" />
              <NavCard href="/admin/health" title="System health" desc="Dropbox, AI, DB status" icon="❤️" />
              <NavCard href="/admin/errors" title="Error log" desc="Recent failures" icon="⚠️" />
              <NavCard href="/admin/announcements" title="Announcements" desc="Site-wide banners" icon="📣" />
              <NavCard href="/admin/flags" title="Feature flags" desc="Toggle features" icon="🚩" />
            </div>
          </>
        )}

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <div className="p-5">
            <AccountForm
              initialName={session?.user?.name || ""}
              email={session?.user?.email || ""}
              role={session?.user?.role || ""}
            />
          </div>
        </Card>

        {/* Accent Color */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-3 dark:text-white">Accent color</h2>
            <AccentPicker />
          </div>
        </Card>
        {/* Two-Factor Authentication */}

        {/* Timezone */}
        <Card>
          <CardHeader>
            <CardTitle>Timezone</CardTitle>
          </CardHeader>
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-2 dark:text-white">Display timezone</h2>
            <TimezonePicker initial={userTimezone} />
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Two-Factor Authentication</CardTitle>
          </CardHeader>
          <div className="p-5">
            <TwoFactorForm initiallyEnabled={twoFactorEnabled} />
          </div>
        </Card>

        {/* Sessions */}
        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-2 dark:text-white">Sessions</h2>
            <p className="text-xs text-graphite-500 dark:text-graphite-400 mb-2">
              Review your recent sign-in activity.
            </p>
            <a href="/settings/sessions" className="text-xs text-cyan hover:underline">
              View recent sign-ins →
            </a>
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

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-graphite-900">Browser Notifications</div>
                <div className="text-xs text-graphite-400">Get notified when jobs finish, even on another tab</div>
              </div>
              <NotificationToggle />
            </div>
            <hr className="border-graphite-200" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-graphite-900">Email Notifications</div>
                <div className="text-xs text-graphite-400">Receive an email when jobs are ready for review</div>
              </div>
              <EmailNotificationToggle initialEnabled={emailNotificationsEnabled} />
            </div>
            <hr className="border-graphite-200" />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-graphite-900">Weekly digest</div>
                <div className="text-xs text-graphite-400">Summary of your jobs and spend each Monday</div>
              </div>
              <WeeklyDigestToggle initial={weeklyDigestEnabled} />
            </div>
            <hr className="border-graphite-200" />
            <SoundToggle />
          </div>
        </Card>

        {/* Event-based Notification Preferences */}
        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-2 dark:text-white">Notification preferences</h2>
            <NotificationPrefs initial={{
              notifyJobReady,
              notifyClientComment,
              notifyPhotoFailed,
            }} />
          </div>
        </Card>

        {/* Slack / Discord Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Slack / Discord notifications</CardTitle>
          </CardHeader>
          <div className="p-4">
            <WebhookForm initial={slackWebhookUrl} />
          </div>
        </Card>

        {/* Invoice Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Settings</CardTitle>
          </CardHeader>
          <div className="p-5">
            <p className="text-xs text-graphite-400 mb-4">Used to generate PDF invoices for approved jobs. The rate is multiplied by the number of approved photos.</p>
            <InvoiceSettingsForm
              initialBusinessName={invoiceSettings.businessName}
              initialBusinessEmail={invoiceSettings.businessEmail}
              initialBusinessPhone={invoiceSettings.businessPhone}
              initialBusinessAddress={invoiceSettings.businessAddress}
              initialInvoiceRate={invoiceSettings.invoiceRate}
              initialInvoicePrefix={invoiceSettings.invoicePrefix}
            />
          </div>
        </Card>

        {/* Watermark Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Watermark Logo</CardTitle>
          </CardHeader>
          <div className="p-4">
            <WatermarkLogoUpload initial={watermarkLogoPath} />
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

        {/* Data Export */}
        <Card>
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-2 dark:text-white">Export your data</h2>
            <p className="text-xs text-graphite-500 dark:text-graphite-400 mb-3">
              Download all your jobs, photos, clients, presets and templates as a JSON file. Image files are stored in your Dropbox and not included.
            </p>
            <a
              href="/api/user/export-data"
              download
              className="text-xs px-3 py-1.5 rounded bg-cyan text-white font-semibold inline-block hover:opacity-90 transition"
            >
              Download JSON
            </a>
          </div>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card>
          <CardHeader>
            <CardTitle>Keyboard & Input</CardTitle>
          </CardHeader>
          <div className="p-5">
            <Link href="/settings/keyboard" className="flex items-center gap-3 hover:bg-graphite-50 dark:hover:bg-graphite-800 p-3 rounded transition">
              <CommandLineIcon className="w-5 h-5 text-graphite-600 dark:text-graphite-400" />
              <div>
                <div className="text-sm font-semibold text-graphite-900 dark:text-white">Keyboard Shortcuts</div>
                <div className="text-xs text-graphite-400">Customize your keyboard bindings</div>
              </div>
            </Link>
          </div>
        </Card>

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

function NavCard({ href, title, desc, icon }: { href: string; title: string; desc: string; icon: string }) {
  return (
    <Link href={href} className="block p-4 bg-white dark:bg-graphite-900 border border-graphite-100 dark:border-graphite-800 rounded-lg hover:border-cyan hover:shadow-sm transition-all">
      <div className="flex items-start gap-2">
        <span className="text-xl">{icon}</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold dark:text-white truncate">{title}</div>
          <div className="text-[11px] text-graphite-500 dark:text-graphite-400 truncate">{desc}</div>
        </div>
      </div>
    </Link>
  );
}
