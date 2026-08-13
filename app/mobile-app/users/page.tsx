import { AlertTriangle } from "lucide-react";

import { UsersIndexTable } from "@/components/mobile-app/user-profile/users-index-table";
import { getMobileUserHealth } from "@/lib/mobile/api";
import { hasPartBCapability } from "@/lib/mobile/user-health/wave";

const GENERATED_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function MobileUsersPage() {
  const result = await getMobileUserHealth({ days: 30, schoolId: null });

  if (!result.ok) {
    return (
      <div
        data-testid="mobile-users-index-error"
        className="mx-auto max-w-7xl space-y-4"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Mobile app operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Users</h1>
          <p className="mt-1 text-sm text-slate-500">
            EA roster and links to individual mobile reporting profiles.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold">Users index unavailable</p>
            <p className="mt-1">{result.message}</p>
            <p className="mt-2 text-xs text-red-600">Status {result.status}</p>
          </div>
        </div>
      </div>
    );
  }

  const { data } = result;

  return (
    <div
      data-testid="mobile-users-index-success"
      className="mx-auto max-w-7xl space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Mobile app operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Users</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
            Eligible EA roster with current school, rollout wave, stage, and a
            link to each person&apos;s full mobile reporting profile.
          </p>
        </div>
        <p className="shrink-0 text-xs text-slate-400">
          Generated {GENERATED_FORMAT.format(new Date(data.generated_at))} SAST
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
        {data.users.length.toLocaleString("en-ZA")} eligible EA
        {data.users.length === 1 ? "" : "s"} across all current schools.
      </div>

      <UsersIndexTable
        users={data.users}
        days={data.days}
        lifetimeEvidence={hasPartBCapability(data)}
      />
    </div>
  );
}
