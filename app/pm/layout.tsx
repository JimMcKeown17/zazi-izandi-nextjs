import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getProgrammeOverview } from "@/lib/pm/api";
import { PMSidebar } from "@/components/pm/layout/pm-sidebar";
import { canSendNotifications } from "@/lib/pm/notification-roles";

export const metadata: Metadata = {
  title: "PM Dashboard | Zazi iZandi",
};

export default async function PMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ data }, { sessionClaims }] = await Promise.all([
    getProgrammeOverview(),
    auth(),
  ]);
  const flagCount = data.kpis.active_flags;
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Suspense fallback={null}>
        <PMSidebar
          flagCount={flagCount}
          canSendNotifications={canSendNotifications(role)}
        />
      </Suspense>
      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-x-hidden pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
