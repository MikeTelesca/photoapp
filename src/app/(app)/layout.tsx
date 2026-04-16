import { TopNav } from "@/components/layout/top-nav";
import { SideNav } from "@/components/layout/side-nav";
import { AppTopbar } from "@/components/layout/app-topbar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { DropboxAlertBanner } from "@/components/layout/dropbox-alert-banner";
import { CommandPalette } from "@/components/layout/command-palette";
import { ShortcutCheatsheet } from "@/components/layout/shortcut-cheatsheet";
import { GlobalShortcuts } from "@/components/layout/global-shortcuts";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-graphite-50 dark:bg-graphite-950">
      {/* Desktop: persistent left rail */}
      <SideNav />

      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Mobile: keep existing top nav (desktop hides it) */}
        <div className="md:hidden">
          <TopNav />
        </div>

        {/* Desktop topbar: search + date + New Job */}
        <div className="hidden md:block">
          <AppTopbar />
        </div>

        <DropboxAlertBanner />

        <main className="flex-1">{children}</main>
      </div>

      <MobileBottomNav />
      <CommandPalette />
      <ShortcutCheatsheet />
      <GlobalShortcuts />
      <FeedbackWidget />
    </div>
  );
}
