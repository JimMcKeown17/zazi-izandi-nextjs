import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getProgrammeOverview } from "@/lib/pm/api";
import { PMSidebar } from "@/components/pm/layout/pm-sidebar";
import { canSendNotifications } from "@/lib/pm/notification-roles";

export const metadata: Metadata = {
  title: "PM Dashboard | Zazi iZandi",
};

async function PMFlagCountBadge() {
  const { data } = await getProgrammeOverview();
  const flagCount = data.kpis.active_flags;

  if (flagCount <= 0) return null;

  return (
    <span className="ml-auto min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold text-white">
      {flagCount}
    </span>
  );
}

async function PMAuthenticatedSidebar({
  flagBadge,
}: {
  flagBadge: React.ReactNode;
}) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;

  return (
    <PMSidebar
      flagBadge={flagBadge}
      canSendNotifications={canSendNotifications(role)}
    />
  );
}

function PMSidebarFallback() {
  return (
    <>
      <aside
        className="hidden h-screen w-52 shrink-0 flex-col bg-slate-900 md:flex print:!hidden"
        aria-hidden="true"
      >
        <div className="border-b border-slate-700/50 px-3 py-4">
          <span className="block text-sm font-bold leading-tight text-accent-yellow">
            Zazi iZandi PM
          </span>
        </div>
        <div className="space-y-3 border-b border-slate-700/50 px-3 py-3">
          <div className="h-3 w-16 animate-pulse rounded bg-slate-700 motion-reduce:animate-none" />
          <div className="h-8 w-full animate-pulse rounded bg-slate-800 motion-reduce:animate-none" />
        </div>
        <div className="flex-1 space-y-2 px-2 py-3">
          {Array.from({ length: 9 }, (_, index) => (
            <div
              key={index}
              className="h-8 w-full animate-pulse rounded bg-slate-800 motion-reduce:animate-none"
            />
          ))}
        </div>
      </aside>
      <div
        className="fixed inset-x-0 bottom-0 z-50 h-[53px] border-t border-slate-700 bg-slate-900 md:hidden print:!hidden"
        aria-hidden="true"
      />
    </>
  );
}

export default function PMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Suspense fallback={<PMSidebarFallback />}>
        <PMAuthenticatedSidebar
          flagBadge={
            <Suspense fallback={null}>
              <PMFlagCountBadge />
            </Suspense>
          }
        />
      </Suspense>
      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-x-hidden pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
