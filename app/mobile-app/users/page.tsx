import { AlertTriangle } from "lucide-react";

import { UsersIndexHeader } from "@/components/mobile-app/user-profile/users-index-header";
import { UsersIndexTable } from "@/components/mobile-app/user-profile/users-index-table";
import { getMobileUserHealth } from "@/lib/mobile/api";
import { getAuthenticatedMobileSession } from "@/lib/mobile/auth";
import { hasCapability } from "@/lib/mobile/capabilities";
import { hasPartBCapability } from "@/lib/mobile/user-health/wave";

export default async function MobileUsersPage() {
  const [result, session] = await Promise.all([
    getMobileUserHealth({ days: 30, schoolId: null }),
    getAuthenticatedMobileSession(),
  ]);
  const canExport = hasCapability(session.role, "mobile.csv.export");

  if (!result.ok) {
    return (
      <div
        data-testid="mobile-users-index-error"
        className="mx-auto max-w-7xl space-y-4"
      >
        <UsersIndexHeader canExport={canExport} generatedAt={null} />
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
      <UsersIndexHeader
        canExport={canExport}
        generatedAt={data.generated_at}
      />

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
