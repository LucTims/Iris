import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import WelcomeModal from "@/components/WelcomeModal";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F9FAFB] font-body text-neutral-900">
      {/* Sidebar is fixed on the left (Desktop) and at the bottom (Mobile) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header is always fixed at the top */}
        <TopHeader />

        {/* Scrollable Page Content */}
        {/* On mobile, we add pb-20 to ensure content isn't hidden behind the bottom navigation bar */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0 relative">
          {children}
        </main>
      </div>

      {/* First-time Welcome Popup */}
      <WelcomeModal />
    </div>
  );
}
