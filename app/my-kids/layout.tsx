import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { MyKidsTopBar } from "@/components/my-kids/top-bar";
import { getEaOverview } from "@/lib/ea/api";
import type { EaMetadata } from "@/lib/ea/types";

export const metadata: Metadata = {
  title: "My Kids | Zazi iZandi",
};

export default async function MyKidsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sessionClaims } = await auth();
  const meta = sessionClaims?.metadata as EaMetadata | undefined;
  const userId = meta?.teampact_user_id;

  let eaName = meta?.teampact_user_name ?? "Welcome";
  let schoolName: string | undefined;

  if (userId) {
    const result = await getEaOverview(userId);
    if (result.ok && result.data.ea_name) {
      eaName = result.data.ea_name;
      schoolName = result.data.primary_school || undefined;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MyKidsTopBar eaName={eaName} schoolName={schoolName} />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20">{children}</main>
    </div>
  );
}
