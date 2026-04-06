import type { Metadata } from "next";
import { getProgrammeOverview } from "@/lib/pm/api";
import { PMSidebar } from "@/components/pm/layout/pm-sidebar";

export const metadata: Metadata = {
  title: "PM Dashboard | Zazi iZandi",
};

export default async function PMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data } = await getProgrammeOverview();
  const flagCount = data.kpis.active_flags;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <PMSidebar flagCount={flagCount} />
      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-x-hidden pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
