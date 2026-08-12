import type { FunnelCounts } from "@/lib/mobile/user-health/funnel";
import type { MobileRolloutWave } from "@/lib/mobile/user-health/types";
import { getWaveDayNumber } from "@/lib/mobile/user-health/wave";

interface UserHealthWaveFunnelProps {
  counts: FunnelCounts;
  days: number;
  wave: MobileRolloutWave | null;
  generatedAt: string;
}

export function UserHealthWaveFunnel({
  counts,
  days,
  wave,
  generatedAt,
}: UserHealthWaveFunnelProps) {
  const dayNumber = wave
    ? getWaveDayNumber(wave.launch_date, generatedAt)
    : null;
  const heading = wave
    ? dayNumber !== null && dayNumber >= 0
      ? `${wave.name} · launched ${wave.launch_date} · day ${dayNumber}`
      : `${wave.name} · launches ${wave.launch_date}`
    : `No wave · ${counts.accounts} accounts`;
  const barRows = [
    {
      label: "Accounts",
      count: counts.accounts,
      caveat: "excludes synthetic and banned",
    },
    { label: "Auth ready", count: counts.auth_ready },
    {
      label: "Device signal (ever)",
      count: counts.device_signal,
      caveat:
        "positive evidence only — absence is unknown, not 'not installed'",
    },
    { label: "Opened app (ever)", count: counts.opened_app_ever },
    { label: "Activated (ever)", count: counts.activated_ever },
    { label: `Active · ${days}d`, count: counts.active_in_window },
  ];
  const authenticationPercentage = Math.round(
    (counts.logged_in_after_provisioning /
      Math.max(counts.authentication_measurable, 1)) *
      100
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h2 className="text-base font-bold text-slate-900">{heading}</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Evidence coverage for this wave subset. Each row is independent — an
          EA can be active without a device signal.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {barRows.map((row) => {
          const percentage = Math.round(
            (row.count / Math.max(counts.accounts, 1)) * 100
          );
          const width = Math.min(
            100,
            Math.max(
              (row.count / Math.max(counts.accounts, 1)) * 100,
              row.count > 0 ? 2 : 0
            )
          );

          return (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 sm:grid-cols-[minmax(11rem,0.8fr)_minmax(12rem,2fr)_5rem] sm:items-center"
            >
              <div className="col-start-1 row-start-1">
                <p className="text-sm font-semibold text-slate-800">
                  {row.label}
                </p>
                {row.caveat ? (
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                    {row.caveat}
                  </p>
                ) : null}
              </div>
              <div
                aria-hidden="true"
                className="col-span-2 row-start-2 h-2.5 overflow-hidden rounded-full bg-slate-100 sm:col-span-1 sm:col-start-2 sm:row-start-1"
              >
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="col-start-2 row-start-1 text-right text-sm font-semibold tabular-nums text-slate-700 sm:col-start-3">
                {row.count} · {percentage}%
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 space-y-2 border-t border-slate-200 pt-4">
        {counts.authentication_measurable === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            <span className="font-semibold">Logged in after provisioning:</span>{" "}
            Not measured — no trusted provisioning cutoff for these accounts
          </p>
        ) : (
          <p className="px-3 py-2 text-sm text-slate-700">
            <span className="font-semibold">Logged in after provisioning:</span>{" "}
            <span className="tabular-nums">
              {counts.logged_in_after_provisioning}/
              {counts.authentication_measurable} of measurable accounts ·{" "}
              {authenticationPercentage}%
            </span>
          </p>
        )}
        <p className="px-3 py-2 text-sm text-slate-700">
          <span className="font-semibold">Seeded data ready:</span>{" "}
          <span className="tabular-nums">
            {counts.seeded_data_ready}/{counts.seeded_expected} of the seeded
            cohort
          </span>
        </p>
      </div>
    </section>
  );
}
