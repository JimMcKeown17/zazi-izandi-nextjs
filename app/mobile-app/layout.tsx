import type { Metadata } from "next";

import { MobileSidebar } from "@/components/mobile-app/layout/mobile-sidebar";
import { requireMobileSessionsSession } from "@/lib/mobile/auth";
import { hasCapability } from "@/lib/mobile/capabilities";

export const metadata: Metadata = {
  title: "Mobile App Data | Zazi iZandi",
};

export default async function MobileAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireMobileSessionsSession();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <MobileSidebar
        canReadSessions={hasCapability(
          session.role,
          "mobile.sessions.read"
        )}
      />
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-24 md:p-6 md:pb-6">
        {children}
      </main>
    </div>
  );
}
