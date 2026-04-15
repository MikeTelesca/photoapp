import { Sidebar } from "@/components/layout/sidebar";
import { MainContent } from "@/components/layout/main-content";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { DropboxAlertBanner } from "@/components/layout/dropbox-alert-banner";
import { AnnouncementsBanner } from "@/components/announcements/banner";
import { CommandPalette } from "@/components/layout/command-palette";
import { ShortcutCheatsheet } from "@/components/layout/shortcut-cheatsheet";
import { LiveProgressIndicator } from "@/components/dashboard/live-progress-indicator";
import { GlobalShortcuts } from "@/components/layout/global-shortcuts";
import { QuickAddFab } from "@/components/layout/quick-add-fab";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen pb-16 md:pb-0">
      <ImpersonationBanner />
      <DropboxAlertBanner />
      <AnnouncementsBanner />
      <div className="flex flex-1">
        <Sidebar />
        <MainContent>{children}</MainContent>
      </div>
      <WelcomeModal />
      <MobileBottomNav />
      <CommandPalette />
      <ShortcutCheatsheet />
      <LiveProgressIndicator />
      <GlobalShortcuts />
      <QuickAddFab />
      <FeedbackWidget />
    </div>
  );
}
