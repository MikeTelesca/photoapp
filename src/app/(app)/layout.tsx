import { TopNav } from "@/components/layout/top-nav";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { DropboxAlertBanner } from "@/components/layout/dropbox-alert-banner";
import { CommandPalette } from "@/components/layout/command-palette";
import { ShortcutCheatsheet } from "@/components/layout/shortcut-cheatsheet";
import { GlobalShortcuts } from "@/components/layout/global-shortcuts";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen pb-16 md:pb-0 bg-graphite-50 dark:bg-graphite-950">
      <TopNav />
      <DropboxAlertBanner />
      <main className="flex-1">{children}</main>
      <MobileBottomNav />
      <CommandPalette />
      <ShortcutCheatsheet />
      <GlobalShortcuts />
      <FeedbackWidget />
    </div>
  );
}
