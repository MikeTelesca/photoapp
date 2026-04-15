import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MainContent } from "@/components/layout/main-content";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { ProductTour } from "@/components/onboarding/product-tour";
import { prisma } from "@/lib/db";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { ImpersonateBanner } from "@/components/layout/impersonate-banner";
import { DropboxAlertBanner } from "@/components/layout/dropbox-alert-banner";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { CommandPalette } from "@/components/layout/command-palette";
import { ShortcutCheatsheet } from "@/components/layout/shortcut-cheatsheet";
import { LiveProgressIndicator } from "@/components/dashboard/live-progress-indicator";
import { GlobalShortcuts } from "@/components/layout/global-shortcuts";
import { QuickAddFab } from "@/components/layout/quick-add-fab";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { DashboardBackground } from "@/components/layout/dashboard-background";
import { auth } from "@/lib/auth";
import { getMaintenanceState } from "@/lib/maintenance";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Maintenance gate: when enabled, redirect non-admin users to /maintenance.
  // Admins keep access so they can disable maintenance from the admin UI.
  const [{ enabled }, session] = await Promise.all([
    getMaintenanceState(),
    auth(),
  ]);
  if (enabled && session?.user?.role !== "admin") {
    redirect("/maintenance");
  }

  // Show the first-run product tour only if the user hasn't completed it yet.
  let showTour = false;
  if (session?.user?.id) {
    try {
      const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { onboardedAt: true },
      });
      showTour = !u?.onboardedAt;
    } catch {
      showTour = false;
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-16 md:pb-0">
      <DashboardBackground />
      <ImpersonationBanner />
      <ImpersonateBanner />
      <DropboxAlertBanner />
      <AnnouncementBanner />
      <div className="flex flex-1">
        <Sidebar />
        <MainContent>{children}</MainContent>
      </div>
      <WelcomeModal />
      {showTour && <ProductTour />}
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
