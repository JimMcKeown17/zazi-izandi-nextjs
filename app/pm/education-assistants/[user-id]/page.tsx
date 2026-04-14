import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getEaOverview } from "@/lib/ea/api";
import { BackendErrorState } from "@/components/my-kids/backend-error-state";

interface Params {
  "user-id": string;
}

export default async function PMEaDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const resolved = await params;
  const userIdNum = Number(resolved["user-id"]);
  if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
    redirect("/pm/education-assistants");
  }

  const result = await getEaOverview(userIdNum);
  if (!result.ok) {
    return <BackendErrorState />;
  }

  const { data } = result;

  // The Django ea_detail_overview view returns 200 with empty fields for
  // unknown user_ids — it does NOT 404. We can't distinguish "unknown user"
  // from "real EA with zero groups" from the response shape alone, so we
  // render a single explainer that covers both cases. The user gets a
  // visible signal that something's missing and a "Back to EAs" link to
  // recover, rather than either a misleading redirect or a fully blank page.
  const isEmptyOrUnknown = !data.ea_name && data.groups.length === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/pm/education-assistants"
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to EAs
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          {data.ea_name || `EA ${userIdNum}`}
        </h1>
        {data.primary_school ? (
          <p className="text-xs text-slate-500">{data.primary_school}</p>
        ) : null}
        <p className="mt-1 text-xs text-slate-400">
          {data.groups.length}{" "}
          {data.groups.length === 1 ? "group" : "groups"}
        </p>
      </div>

      {isEmptyOrUnknown ? (
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-900">
            No data for this EA yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Either the EA ID <code className="font-mono text-slate-600">{userIdNum}</code>{" "}
            doesn&apos;t match any known EA, or this EA has been added but has
            no group sessions yet. Use the back link above to return to the EA
            list.
          </p>
        </div>
      ) : data.groups.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4 text-xs text-slate-500">
          This EA has no groups in the current data.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {data.groups.map((g, index) => (
            <li key={g.class_id ?? index}>
              {g.class_id !== null ? (
                <Link
                  href={`/pm/education-assistants/${userIdNum}/groups/${g.class_id}`}
                  className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {g.group_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {g.grade} · {g.school_name}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {g.total_sessions} sessions
                  </span>
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-400">
                      {g.group_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {g.grade} · {g.school_name} (no class_id)
                    </p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-[10px] italic text-slate-400">
        Phase 1D will expand this page with sessions/day, alignment badges,
        flag pills, and progress bars per group row. For now, click a group
        to see its detail page.
      </p>
    </div>
  );
}
