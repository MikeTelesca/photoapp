import { Sidebar } from "@/components/layout/sidebar";
import { MainContent } from "@/components/layout/main-content";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <MainContent>{children}</MainContent>
      <WelcomeModal />
    </div>
  );
}
