import { redirect } from "next/navigation";
import { getGroupDetail } from "@/lib/ea/api";
import { BackendErrorState } from "@/components/my-kids/backend-error-state";
import { GroupDetailHeader } from "@/components/group-detail/group-detail-header";
import { FlagPillStrip } from "@/components/group-detail/flag-pill-strip";
import { CoachingTipPanel } from "@/components/group-detail/coaching-tip-panel";
import { LetterMasteryPath } from "@/components/group-detail/letter-mastery-path";
import { ChildrenList } from "@/components/group-detail/children-list";
import { RecentSessions } from "@/components/group-detail/recent-sessions";

interface Params {
  "user-id": string;
  class_id: string;
}

export default async function PMGroupDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const resolved = await params;
  const userIdNum = Number(resolved["user-id"]);
  const classIdNum = Number(resolved.class_id);

  // Invalid user_id → redirect all the way back to the scatter plot
  // (the EA detail stub at /pm/education-assistants/<user-id> would also
  // bounce on this, so save a hop).
  if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
    redirect("/pm/education-assistants");
  }

  // Invalid class_id but valid user_id → redirect to the EA detail page
  // (Task 16 stub) so the PM can pick a different group for the same EA.
  // This matches spec § 7 line 460: "Redirect to /pm/education-assistants/[user-id]".
  if (!Number.isFinite(classIdNum) || classIdNum <= 0) {
    redirect(`/pm/education-assistants/${userIdNum}`);
  }

  const result = await getGroupDetail(userIdNum, classIdNum);

  if (!result.ok) {
    if (result.status === 404) {
      redirect(`/pm/education-assistants/${userIdNum}`);
    }
    return <BackendErrorState />;
  }

  const { data } = result;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <GroupDetailHeader
        group={data}
        backHref={`/pm/education-assistants/${userIdNum}`}
        backLabel="Back to EA"
      />
      {/* PM-only: raw flag pills for fast scanning (per data doc § PM copy) */}
      <FlagPillStrip flags={data.flags} />
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
