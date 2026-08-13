import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  MapPin,
} from "lucide-react";

import { EmploymentBadge } from "@/components/mobile-app/employment-badge";
import { toHealthRowShape } from "@/lib/mobile/user-profile/presentation";
import type { MobileUserProfileResponse } from "@/lib/mobile/user-profile/types";
import {
  getActivityStage,
  hasRecentAppActivity,
  isQuiet,
} from "@/lib/mobile/user-health/presentation";
import { getWaveDayNumber } from "@/lib/mobile/user-health/wave";
import { cn } from "@/lib/utils";

const STAGE_STYLES = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  reached: "bg-blue-50 text-blue-700 ring-blue-200",
  not_started: "bg-slate-100 text-slate-600 ring-slate-200",
} as const;

export function ProfileHeader({
  profile,
}: {
  profile: MobileUserProfileResponse;
}) {
  const user = toHealthRowShape(profile);
  const stage = getActivityStage(user);
  const StageIcon =
    stage === "active"
      ? CheckCircle2
      : stage === "reached"
        ? Clock3
        : CircleDashed;
  const stageLabel =
    stage === "active"
      ? "Activated"
      : stage === "reached"
        ? "Reached"
        : "Not started";
  return (
    <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            EA profile
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              {user.display_name}
            </h1>
            <EmploymentBadge status={user.employment_status} />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            {user.current_school}
          </p>
          {profile.wave ? (
            <p className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 ring-1 ring-inset ring-blue-200">
              {profile.wave.name} · launched {profile.wave.launch_date} · day{" "}
              {getWaveDayNumber(
                profile.wave.launch_date,
                profile.generated_at
              )}
            </p>
          ) : (
            <p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              No rollout wave
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
              STAGE_STYLES[stage]
            )}
          >
            <StageIcon className="h-3 w-3" /> {stageLabel}
          </span>
          {hasRecentAppActivity(user) ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
              Active · {profile.days}d
            </span>
          ) : null}
          {isQuiet(user) ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
              Quiet · {profile.days}d
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
