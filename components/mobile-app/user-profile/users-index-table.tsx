import Link from "next/link";

import {
  getActivityStage,
  isQuiet,
  type ActivityStage,
} from "@/lib/mobile/user-health/presentation";
import type { MobileUserHealthRow } from "@/lib/mobile/user-health/types";
import { cn } from "@/lib/utils";

const STAGE_STYLES: Record<ActivityStage, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  reached: "bg-blue-50 text-blue-700 ring-blue-200",
  not_started: "bg-slate-100 text-slate-600 ring-slate-200",
};

function stageLabel(
  user: MobileUserHealthRow,
  days: number,
  lifetimeEvidence: boolean
): string {
  const stage = getActivityStage(user);
  if (stage === "active") {
    return lifetimeEvidence ? "Activated" : `Active · ${days}d`;
  }
  if (stage === "reached") return lifetimeEvidence ? "Reached" : "Onboarding";
  return "Not started";
}

export function UsersIndexTable({
  users,
  days,
  lifetimeEvidence,
}: {
  users: MobileUserHealthRow[];
  days: number;
  lifetimeEvidence: boolean;
}) {
  const sortedUsers = [...users].sort((left, right) =>
    left.display_name.localeCompare(right.display_name, "en-ZA")
  );

  if (sortedUsers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <p className="font-semibold text-slate-800">No EAs found</p>
        <p className="mt-1 text-sm text-slate-500">
          The eligible reporting roster is currently empty.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">
              <th className="px-4 py-3">EA</th>
              <th className="px-4 py-3">Current school</th>
              <th className="px-4 py-3">Rollout wave</th>
              <th className="px-4 py-3">Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedUsers.map((user) => {
              const stage = getActivityStage(user);
              return (
                <tr key={user.user_id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/mobile-app/users/${user.user_id}`}
                      className="font-bold text-primary hover:underline"
                    >
                      {user.display_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {user.current_school}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {user.wave?.name ?? "No wave"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                          STAGE_STYLES[stage]
                        )}
                      >
                        {stageLabel(user, days, lifetimeEvidence)}
                      </span>
                      {lifetimeEvidence && isQuiet(user) ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                          Quiet · {days}d
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
