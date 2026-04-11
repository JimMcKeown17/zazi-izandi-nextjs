import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { MyKidsTopBar } from "@/components/my-kids/top-bar";

export const metadata: Metadata = {
  title: "My Kids | Zazi iZandi",
};

type EaMetadata = {
  role?: string;
  teampact_user_id?: number;
  teampact_user_name?: string;
};

export default async function MyKidsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sessionClaims } = await auth();
  const metadata = sessionClaims?.metadata as EaMetadata | undefined;
  const eaName = metadata?.teampact_user_name ?? "Welcome";

  return (
    <div className="min-h-screen bg-slate-50">
      <MyKidsTopBar eaName={eaName} />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-20">{children}</main>
    </div>
  );
}
