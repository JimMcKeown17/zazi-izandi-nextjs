import { Radio, Smartphone, UserCheck, Waypoints } from "lucide-react";

import {
  buildDeviceVersionBreakdown,
  splitVersionBreakdown,
} from "@/lib/mobile/user-health/devices";
import type { MobileUserHealthRow } from "@/lib/mobile/user-health/types";

function EvidenceMetric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Radio;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>
    </div>
  );
}

export function UserHealthTechnicalEvidence({
  users,
}: {
  users: MobileUserHealthRow[];
}) {
  const authenticationMeasurable = users.filter(
    (user) => user.auth.authenticated_after_provisioning !== null
  ).length;
  const authenticated = users.filter(
    (user) => user.auth.authenticated_after_provisioning === true
  ).length;
  const openedEver = users.filter((user) => user.last_app_open_at != null).length;
  const pushReachable = users.filter((user) => user.app_device.registered).length;
  const versionBreakdown = buildDeviceVersionBreakdown(users);
  const { top, remainderVersions, remainderCount } = splitVersionBreakdown(
    versionBreakdown,
    6
  );

  return (
    <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
        Technical rollout evidence
        <span className="ml-2 font-normal text-slate-500">
          Telemetry coverage and contactability
        </span>
      </summary>
      <div className="space-y-4 border-t border-slate-100 px-4 py-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <EvidenceMetric
            label="Auth after provisioning"
            value={`${authenticated}/${authenticationMeasurable}`}
            detail="Successful Auth event after a trusted credential-release cutoff"
            icon={UserCheck}
          />
          <EvidenceMetric
            label="Opened app ever"
            value={openedEver}
            detail="Direct signed-in app-open evidence; older builds may not report it"
            icon={Waypoints}
          />
          <EvidenceMetric
            label="Push reachable now"
            value={pushReachable}
            detail="A current push token, not an install or notification-acceptance denominator"
            icon={Smartphone}
          />
          <EvidenceMetric
            label="Observed app versions"
            value={versionBreakdown.length}
            detail="Distinct versions among currently registered devices"
            icon={Radio}
          />
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            App versions in the field
          </h3>
          {top.length > 0 ? (
            <ul className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-700">
              {top.map((row) => (
                <li key={row.label} className="rounded bg-slate-100 px-2 py-1 tabular-nums">
                  {row.label} — {row.count}
                </li>
              ))}
              {remainderVersions > 0 ? (
                <li className="rounded bg-slate-100 px-2 py-1 text-slate-500 tabular-nums">
                  +{remainderVersions} more · {remainderCount} devices
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              No currently registered devices in this population.
            </p>
          )}
        </div>
      </div>
    </details>
  );
}
