import { AlertTriangle, Info, MapPinOff } from "lucide-react";

import { AttendanceFilters } from "@/components/mobile-app/attendance/attendance-filters";
import { AttendanceLedger } from "@/components/mobile-app/attendance/attendance-ledger";
import { AttendanceSummary } from "@/components/mobile-app/attendance/attendance-summary";
import { AttendanceTrendChart } from "@/components/mobile-app/attendance/attendance-trend-chart";
import { getMobileTimeEntriesActivity } from "@/lib/mobile/api";
import { requireMobileTimeEntriesSession } from "@/lib/mobile/auth";
import { hasCapability } from "@/lib/mobile/capabilities";
import { buildDailyClockSeries } from "@/lib/mobile/time-entries/daily-series";

interface AttendancePageProps {
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

export default async function MobileAttendancePage({
  searchParams,
}: AttendancePageProps) {
  const [params, session] = await Promise.all([
    searchParams,
    requireMobileTimeEntriesSession(),
  ]);
  const days = parseDays(firstValue(params.days));
  const initialQuery = firstValue(params.q) ?? "";
  const view = firstValue(params.view) === "ea" ? "ea" : "shifts";
  const schoolId = firstValue(params.school_id) || null;
  const rawSchoolType = firstValue(params.school_type);
  const schoolType =
    rawSchoolType === "ecd" || rawSchoolType === "primary" ? rawSchoolType : null;
  const result = await getMobileTimeEntriesActivity({ days, schoolId, schoolType });

  if (!result.ok) {
    return (
      <div
        data-testid="mobile-attendance-report-error"
        className="mx-auto max-w-7xl space-y-4"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Mobile app reporting
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Clock In/Out
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Daily shift records uploaded by Education Assistants.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold">Clock report unavailable</p>
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
  const trendSeries = buildDailyClockSeries(data.entries, data.days, data.generated_at);

  return (
    <div
      data-testid="mobile-attendance-report-success"
      className="mx-auto max-w-7xl space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Mobile app reporting
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Clock In/Out
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
            One row per recorded shift. School is the EA&apos;s{" "}
            <strong>current roster school</strong>, not historical clock-time
            attribution.
          </p>
        </div>
        <p className="shrink-0 text-xs text-slate-400">
          Generated {GENERATED_FORMAT.format(new Date(data.generated_at))} SAST
        </p>
      </div>

      <AttendanceFilters
        key={`${data.days}|${data.applied_filters.school_id ?? ""}|${schoolType ?? ""}`}
        days={data.days}
        selectedSchoolId={data.applied_filters.school_id}
        selectedSchoolType={schoolType}
        schoolOptions={data.school_options}
        canExport={hasCapability(session.role, "mobile.csv.export")}
      />

      {selectedSchool ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Filtered by current school: <strong>{selectedSchool.name}</strong>
        </div>
      ) : null}

      <AttendanceSummary data={data} />

      <AttendanceTrendChart series={trendSeries} />

      {data.summary.active_entries > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>{data.summary.active_entries} open shift{data.summary.active_entries === 1 ? "" : "s"}</strong>{" "}
            at the time this report was generated. Refresh to retrieve a newer snapshot.
          </p>
        </div>
      ) : null}

      <AttendanceLedger
        key={`${initialQuery}|${view}`}
        entries={data.entries}
        days={data.days}
        schoolId={data.applied_filters.school_id}
        initialQuery={initialQuery}
        initialView={view}
        userHealthLinksEnabled={hasCapability(
          session.role,
          "mobile.user_health.read"
        )}
      />

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-3 text-xs leading-relaxed text-slate-600">
        <MapPinOff className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <p>
          GPS coordinates are deliberately hidden from this page. Authorized CSV
          exports include clock-in and clock-out coordinates for operational
          follow-up.
        </p>
      </div>
    </div>
  );
}
