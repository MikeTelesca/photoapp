import { Sidebar } from "@/components/layout/sidebar";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-[230px] pt-14 md:pt-0">{children}</main>
      <WelcomeModal />
    </div>
  );
}
