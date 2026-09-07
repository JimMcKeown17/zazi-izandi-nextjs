import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getEaOverview } from "@/lib/ea/api";
import type { EaGroup } from "@/lib/ea/types";
import { GroupCard } from "@/components/my-kids/group-card";
import { ZeroGroupsState } from "@/components/my-kids/zero-groups-state";
import { BackendErrorState } from "@/components/my-kids/backend-error-state";

interface Params {
  "user-id": string;
}

export default async function EaMobileViewPreviewPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const resolved = await params;
  const userIdNum = Number(resolved["user-id"]);
  if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
    redirect("/pm/ea-mobile-view");
  }

  const result = await getEaOverview(userIdNum);

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          href="/pm/ea-mobile-view"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to EA search
        </Link>
        <BackendErrorState />
      </div>
    );
  }

  const { data } = result;
  const isEmptyOrUnknown = !data.ea_name && data.groups.length === 0;

  // Custom groupHref so clicks in the preview navigate to the existing
  // Phase 1C PM group detail page (which renders inside the PM layout),
  // not the /my-kids detail page (which is EA-role-gated and PMs can't
  // access anyway).
  const pmGroupHref = (group: EaGroup) =>
    `/pm/education-assistants/${userIdNum}/groups/${group.class_id}`;

  const allSameSchool =
    data.groups.length > 0 &&
    data.groups.every((g) => g.school_name === data.groups[0].school_name);

  const dateStr = new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(new Date());

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* PM chrome — not part of what the EA sees */}
      <Link
        href="/pm/ea-mobile-view"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to EA search
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Viewing as: {data.ea_name || `EA ${userIdNum}`}
        </h1>
        <p className="text-xs text-slate-500">
          This is exactly what{" "}
          {data.ea_name ? data.ea_name.split(" ")[0] : "this EA"} sees on
          their phone when they open{" "}
          <code className="font-mono text-slate-600">/my-kids</code>. Clicks
          on cards navigate to the PM group detail page (not the EA view, to
          keep you in the PM dashboard).
        </p>
      </div>

      {/* The framed preview — narrow width to mimic a mobile viewport */}
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
        {isEmptyOrUnknown ? (
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-900">
              No data for this EA yet
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Either the EA ID{" "}
              <code className="font-mono text-slate-600">{userIdNum}</code>{" "}
              doesn&apos;t match any known EA, or this EA has been added but
              has no group sessions yet.
            </p>
          </div>
        ) : data.groups.length === 0 ? (
          <ZeroGroupsState />
        ) : (
          <div className="space-y-4">
            {/* Mimic the EA top bar */}
            <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">
                {data.ea_name || `EA ${userIdNum}`}
              </p>
              {data.primary_school ? (
                <p className="text-xs text-slate-500">{data.primary_school}</p>
              ) : null}
            </div>

            {/* "My Groups" heading with date */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                My Groups
              </h2>
              <p className="text-sm text-slate-500">{dateStr}</p>
            </div>

            {/* The actual group cards — uses the same component the EA sees,
                just with a different groupHref for PM click targets */}
            <div className="space-y-4">
              {data.groups.map((group, index) => (
                <GroupCard
                  key={group.class_id ?? index}
                  group={group}
                  showSchoolName={!allSameSchool}
                  eaName={data.ea_name || undefined}
                  groupHref={pmGroupHref}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
