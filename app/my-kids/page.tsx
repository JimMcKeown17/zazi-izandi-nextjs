import { auth } from "@clerk/nextjs/server";
import { getEaOverview } from "@/lib/ea/api";
import type { EaMetadata } from "@/lib/ea/types";
import { NotLinkedState } from "@/components/my-kids/not-linked-state";
import { ZeroGroupsState } from "@/components/my-kids/zero-groups-state";
import { BackendErrorState } from "@/components/my-kids/backend-error-state";
import { GroupCard } from "@/components/my-kids/group-card";

function StaleDataNotice({ lastUpdated }: { lastUpdated: string | null }) {
  if (!lastUpdated) return null;
  const updatedAt = new Date(lastUpdated);
  if (isNaN(updatedAt.getTime())) return null;
  const hoursAgo = Math.floor(
    (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60)
  );
  if (hoursAgo < 12) return null;
  return (
    <p className="text-xs text-slate-400">
      Last updated: {hoursAgo} hours ago
    </p>
  );
}

export default async function MyKidsOverviewPage() {
  const { sessionClaims } = await auth();
  const meta = sessionClaims?.metadata as EaMetadata | undefined;

  if (!meta?.teampact_user_id) {
    return <NotLinkedState />;
  }

  const result = await getEaOverview(meta.teampact_user_id);

  if (!result.ok) {
    return <BackendErrorState />;
  }

  const { data } = result;

  if (data.groups.length === 0) {
    return <ZeroGroupsState />;
  }

  const allSameSchool = data.groups.every(
    (g) => g.school_name === data.groups[0].school_name
  );

  const dateStr = new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(new Date());

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">My Groups</h1>
        <p className="text-sm text-slate-500">{dateStr}</p>
        {data.last_updated ? (
          <StaleDataNotice lastUpdated={data.last_updated} />
        ) : null}
      </div>

      <div className="space-y-4">
        {data.groups.map((group, index) => (
          <GroupCard
            key={group.class_id ?? index}
            group={group}
            showSchoolName={!allSameSchool}
          />
        ))}
      </div>
    </div>
  );
}
