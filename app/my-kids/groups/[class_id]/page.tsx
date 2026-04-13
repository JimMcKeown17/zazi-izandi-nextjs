import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getGroupDetail, getEaOverview } from "@/lib/ea/api";
import type { EaMetadata } from "@/lib/ea/types";
import { NotLinkedState } from "@/components/my-kids/not-linked-state";
import { BackendErrorState } from "@/components/my-kids/backend-error-state";
import { GroupDetailHeader } from "@/components/group-detail/group-detail-header";
import { CoachingTipPanel } from "@/components/group-detail/coaching-tip-panel";
import { LetterMasteryPath } from "@/components/group-detail/letter-mastery-path";
import { ChildrenList } from "@/components/group-detail/children-list";
import { RecentSessions } from "@/components/group-detail/recent-sessions";

interface Params {
  class_id: string;
}

export default async function MyKidsGroupDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { class_id } = await params;
  const classIdNum = Number(class_id);
  if (!Number.isFinite(classIdNum) || classIdNum <= 0) {
    redirect("/my-kids");
  }

  const { sessionClaims } = await auth();
  const meta = sessionClaims?.metadata as EaMetadata | undefined;
  if (!meta?.teampact_user_id) {
    return <NotLinkedState />;
  }

  const result = await getGroupDetail(meta.teampact_user_id, classIdNum);

  if (!result.ok) {
    if (result.status === 404) {
      redirect("/my-kids");
    }
    return <BackendErrorState />;
  }

  const { data } = result;

  // Also fetch overview for the EA name used in the header
  // (React.cache() dedups with the layout's call — no extra HTTP request).
  const overviewResult = await getEaOverview(meta.teampact_user_id);
  const eaName =
    overviewResult.ok && overviewResult.data.ea_name
      ? overviewResult.data.ea_name
      : undefined;

  return (
    <div className="space-y-4">
      <GroupDetailHeader
        group={data}
        backHref="/my-kids"
        backLabel="Back to My Groups"
        eaName={eaName}
      />
      <CoachingTipPanel group={data} />
      {data.phase === "letters" ? (
        <LetterMasteryPath letters={data.letter_mastery} />
      ) : null}
      <ChildrenList
        items={data.children}
        mostRecentSessionDate={data.recent_sessions[0]?.date ?? null}
      />
      <RecentSessions sessions={data.recent_sessions} />
    </div>
  );
}
