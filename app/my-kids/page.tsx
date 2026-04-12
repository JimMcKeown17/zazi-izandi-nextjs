import { auth } from "@clerk/nextjs/server";
import { NotLinkedState } from "@/components/my-kids/not-linked-state";

type EaMetadata = {
  role?: string;
  teampact_user_id?: number;
  teampact_user_name?: string;
};

export default async function MyKidsOverviewPage() {
  const { sessionClaims } = await auth();
  const metadata = sessionClaims?.metadata as EaMetadata | undefined;

  if (!metadata?.teampact_user_id) {
    return <NotLinkedState />;
  }

  // Phase 1B will replace this stub with real group cards fetched from
  // /api/ea/<teampact_user_id>/ via lib/ea/api.ts.
  return (
    <div className="py-8 text-center">
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">My Groups</h1>
      <p className="text-sm text-slate-600">
        Your groups will appear here shortly.
      </p>
    </div>
  );
}
