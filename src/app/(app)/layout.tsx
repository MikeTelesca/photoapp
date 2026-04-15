import { Sidebar } from "@/components/layout/sidebar";
import { MainContent } from "@/components/layout/main-content";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { AnnouncementsBanner } from "@/components/announcements/banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <ImpersonationBanner />
      <AnnouncementsBanner />
      <div className="flex flex-1">
        <Sidebar />
        <MainContent>{children}</MainContent>
      </div>
      <WelcomeModal />
    </div>
  );
}
