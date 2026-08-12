import {
  Activity,
  AlertTriangle,
  Database,
  Info,
  LogIn,
  ShieldCheck,
} from "lucide-react";

import { UserHealthBoard } from "@/components/mobile-app/user-health/user-health-board";
import { UserHealthFilters } from "@/components/mobile-app/user-health/user-health-filters";
import { UserHealthSummary } from "@/components/mobile-app/user-health/user-health-summary";
import { getMobileUserHealth } from "@/lib/mobile/api";

interface UserHealthPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseDays(value: string | undefined): number {
  if (!value) return 30;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 90 ? parsed : 30;
}

const GENERATED_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function MobileUserHealthPage({
  searchParams,
}: UserHealthPageProps) {
  const params = await searchParams;
  const days = parseDays(firstValue(params.days));
  const schoolId = firstValue(params.school_id) || null;
  const result = await getMobileUserHealth({ days, schoolId });

  if (!result.ok) {
    return (
      <div
        data-testid="mobile-user-health-report-error"
        className="mx-auto max-w-[96rem] space-y-4"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Mobile app operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">User health</h1>
          <p className="mt-1 text-sm text-slate-500">
            Onboarding, data readiness, and app-usage evidence for EAs.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold">User health board unavailable</p>
            <p className="mt-1">{result.message}</p>
            <p className="mt-2 text-xs text-red-600">Status {result.status}</p>
          </div>
        </div>
      </div>
    );
  }

  const { data } = result;
  const selectedSchool = data.school_options.find(
    (school) => school.id === data.applied_filters.school_id
  );
  const evidenceStages = [
    {
      label: "1 · Access enabled",
      detail: "Auth account exists, is confirmed, and is not blocked.",
      icon: ShieldCheck,
    },
    {
      label: "2 · Mobile login",
      detail: "Not currently measurable; Auth history includes provisioning checks.",
      icon: LogIn,
    },
    {
      label: "3 · Data ready",
      detail: "Expected seeded classes, children, groups, and memberships exist.",
      icon: Database,
    },
    {
      label: "4 · Usage proven",
      detail: "Clock, session, or app-created assessment activity exists.",
      icon: Activity,
    },
  ];

  return (
    <div
      data-testid="mobile-user-health-report-success"
      className="mx-auto max-w-[96rem] space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Mobile app operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">User health</h1>
          <p className="mt-1 max-w-4xl text-sm leading-relaxed text-slate-500">
            A row-level onboarding funnel for EA identity, Auth readiness,
            server-data readiness, and real mobile-app activity.
          </p>
        </div>
        <p className="shrink-0 text-xs text-slate-400">
          Generated {GENERATED_FORMAT.format(new Date(data.generated_at))} SAST
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong>Population:</strong> Banned accounts and known synthetic accounts,
          including <code>+fakedata</code> addresses and staff-test identities, are
          excluded from both the rows and all summary totals. <br />
          <strong>Download/install is not directly observable.</strong> A registered
          push device is positive app evidence, but no token can also mean notification
          permission was denied. Treat “no device signal” as unknown—not “not installed.”{" "}
          Likewise, an enabled Auth account is a login prerequisite, but Supabase Auth
          history cannot prove a youth used the mobile app: credential provisioning
          checks create the same sign-in timestamp. Mobile login will remain explicitly
          unmeasured until the app writes its own authenticated event.
        </p>
      </div>

      <UserHealthFilters
        days={data.days}
        selectedSchoolId={data.applied_filters.school_id}
        schoolOptions={data.school_options}
      />

      {selectedSchool ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Filtered by current school: <strong>{selectedSchool.name}</strong>
        </div>
      ) : null}

      <UserHealthSummary data={data} />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {evidenceStages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.label}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-100/70 p-3"
            >
              <span className="rounded-lg bg-white p-2 text-primary shadow-sm">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                  {stage.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {stage.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <UserHealthBoard users={data.users} days={data.days} />

      <p className="text-xs leading-relaxed text-slate-400">
        “Server data ready” verifies stored ownership/count evidence, not a physical
        device screen. A real signed-in app browse remains the strongest proof that a
        specific EA sees the expected children and groups.
      </p>
    </div>
  );
}
