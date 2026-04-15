import { Sidebar } from "@/components/layout/sidebar";
import { MainContent } from "@/components/layout/main-content";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { AnnouncementsBanner } from "@/components/announcements/banner";
import { CommandPalette } from "@/components/layout/command-palette";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen pb-16 md:pb-0">
      <ImpersonationBanner />
      <AnnouncementsBanner />
      <div className="flex flex-1">
        <Sidebar />
        <MainContent>{children}</MainContent>
      </div>
      <WelcomeModal />
      <MobileBottomNav />
      <CommandPalette />
    </div>
  );
}
