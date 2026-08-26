import { AlertTriangle, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  formatSastTimestamp,
  getIncidentClassification,
  getIncidentIdentity,
  INCIDENT_KIND_COPY,
  shortenActorUuid,
  wasReceivedAfterDeviceObservation,
} from "@/lib/mobile/sync-incidents/presentation";
import type {
  MobileSyncIncidentItem,
  MobileSyncIncidentReceipt,
  MobileSyncIncidentsResponse,
  MobileSyncIncidentsResult,
} from "@/lib/mobile/sync-incidents/types";

function SummaryTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{value}</p>
    </article>
  );
}

function TechnicalValue({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="grid gap-0.5 border-b border-slate-100 py-2 last:border-b-0 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="break-all font-mono text-xs text-slate-800">{String(value)}</dd>
    </div>
  );
}

function getReceiptProvenance(receipt: MobileSyncIncidentReceipt): {
  observedReleaseLabel: string;
  updateId: string;
  launchSource: string;
} {
  if (receipt.schema_version === 1) {
    return {
      observedReleaseLabel: "Unknown",
      updateId: "Unknown",
      launchSource: "Unknown",
    };
  }

  return {
    observedReleaseLabel: receipt.observed_release_label ?? "Unknown",
    updateId:
      receipt.observed_update_id ??
      (receipt.observed_is_embedded_launch === true
        ? "Not applicable (embedded build)"
        : "Unknown"),
    launchSource:
      receipt.observed_is_embedded_launch === false
        ? "OTA update"
        : receipt.observed_is_embedded_launch === true
          ? "Embedded build"
          : "Unknown",
  };
}

export function SyncIncidentList({
  incidents,
}: {
  incidents: MobileSyncIncidentItem[];
}) {
  return (
    <div className="space-y-3" data-testid="mobile-sync-incident-list">
      {incidents.map((item) => {
        const { actor, receipt } = item;
        const copy = INCIDENT_KIND_COPY[receipt.incident_kind];
        const uuidFallback = actor.display_name_source === "uuid";
        const currentSchool =
          actor.current_school_id === null
            ? "No current school recorded"
            : actor.current_school ?? "School name unavailable";
        const provenance = getReceiptProvenance(receipt);
        return (
          <article
            key={getIncidentIdentity(item)}
            className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                    {copy.label}
                  </span>
                  <span className="text-xs text-slate-500">
                    {receipt.descriptor_key ?? "No descriptor reported"}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {uuidFallback ? shortenActorUuid(actor.user_id) : actor.display_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {uuidFallback
                    ? "Canonical name unavailable"
                    : `Actor ${shortenActorUuid(actor.user_id)}`}
                </p>
                <p className="text-sm text-slate-600">
                  Current school: {currentSchool}
                </p>
              </div>
              <Link
                href={`/mobile-app/users/${actor.user_id}`}
                className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                View user <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {copy.explanation}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              {getIncidentClassification(receipt)}
            </p>

            {wasReceivedAfterDeviceObservation(receipt) ? (
              <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                The server received this later than the device-reported observation
                time. Connectivity, app activation, and device-clock differences can
                contribute.
              </p>
            ) : null}

            <dl className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <dt className="text-xs text-slate-500">Received by server</dt>
                <dd className="font-medium text-slate-800">
                  {formatSastTimestamp(receipt.received_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">
                  First reported as observed on device
                </dt>
                <dd className="font-medium text-slate-800">
                  {formatSastTimestamp(receipt.first_seen_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">App and runtime</dt>
                <dd className="font-medium text-slate-800">
                  {receipt.app_version ?? "Unknown app"} · runtime {receipt.runtime_version ?? "unknown"} · {receipt.platform}
                </dd>
              </div>
            </dl>

            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-800">
                Release that observed and queued this receipt
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                It does not prove which release first caused the underlying sync
                condition.
              </p>
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500">Native build</dt>
                  <dd className="break-all font-medium text-slate-800">
                    {receipt.build_number ?? "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Observed App Release</dt>
                  <dd className="break-all font-medium text-slate-800">
                    {provenance.observedReleaseLabel}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Update UUID</dt>
                  <dd className="break-all font-mono text-xs text-slate-800">
                    {provenance.updateId}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Launch source</dt>
                  <dd className="font-medium text-slate-800">
                    {provenance.launchSource}
                  </dd>
                </div>
              </dl>
            </div>

            <details className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                Technical detail
              </summary>
              <dl className="mt-2">
                <TechnicalValue label="Actor UUID" value={receipt.actor_user_id} />
                <TechnicalValue label="Incident key" value={receipt.incident_key} />
                <TechnicalValue label="Mutation UUID" value={receipt.mutation_id} />
                <TechnicalValue label="Local record ID" value={receipt.local_record_id} />
                <TechnicalValue label="Client stream UUID" value={receipt.client_stream_id} />
                <TechnicalValue label="Client generation" value={receipt.client_generation} />
                <TechnicalValue label="Audit sequence" value={receipt.audit_sequence} />
                <TechnicalValue label="Operation" value={receipt.operation} />
                <TechnicalValue label="Source status" value={receipt.source_status} />
                <TechnicalValue label="Attempt count" value={receipt.attempt_count} />
                <TechnicalValue label="Uncertain attempts" value={receipt.uncertain_attempt_count} />
                <TechnicalValue label="Error class" value={receipt.error_class} />
                <TechnicalValue label="Error code" value={receipt.error_code} />
                <TechnicalValue label="Integrity reason" value={receipt.reason} />
                <TechnicalValue label="Detail kind" value={receipt.detail_kind} />
                <TechnicalValue label="Detail code" value={receipt.detail_code} />
                <TechnicalValue label="Last reported as observed on device" value={receipt.last_seen_at} />
                <TechnicalValue label="Occurrence count" value={receipt.occurrence_count} />
                <TechnicalValue label="Build" value={receipt.build_number} />
                <TechnicalValue label="OS version" value={receipt.os_version} />
                <TechnicalValue label="Device model" value={receipt.device_model} />
                <TechnicalValue label="Payload SHA-256" value={receipt.payload_sha256} />
                <TechnicalValue label="Received by server (UTC)" value={receipt.received_at} />
              </dl>
            </details>
          </article>
        );
      })}
    </div>
  );
}

function SuccessPanel({
  data,
  filtersSlot,
  pagerSlot,
}: {
  data: MobileSyncIncidentsResponse;
  filtersSlot?: ReactNode;
  pagerSlot?: ReactNode;
}) {
  return (
    <div
      data-testid="mobile-sync-incident-alerts-success"
      className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Historical device receipts
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Sync incident alerts</h2>
          <p className="mt-1 max-w-4xl text-sm leading-relaxed text-slate-600">
            Bounded conditions phones reported during this SAST window. A receipt does
            not prove the condition is still present or that work was lost.
          </p>
        </div>
        <p className="shrink-0 text-xs text-slate-500">
          Generated {formatSastTimestamp(data.generated_at)}
        </p>
      </div>

      {filtersSlot}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryTile label="Receipts" value={data.summary.receipts} />
        <SummaryTile label="Affected users" value={data.summary.affected_users} />
        <SummaryTile label="Saved-change support receipts" value={data.summary.support_roots} />
        <SummaryTile label="Sync-integrity findings reported" value={data.summary.integrity_findings} />
        <SummaryTile label="Diagnostic coverage constrained" value={data.summary.coverage_constrained} />
        <SummaryTile
          label="Newest backend receipt"
          value={formatSastTimestamp(data.summary.newest_received_at)}
        />
      </div>

      {data.summary.receipts === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm leading-relaxed text-slate-600">
          No sync-support receipts were received for this selection. This does not
          prove every eligible phone has activated the OTA, is online, or has no local
          incident waiting to report.
        </div>
      ) : (
        <details
          data-testid="mobile-sync-incident-receipts"
          className="rounded-lg border border-amber-200 bg-white"
        >
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-50">
            View {data.summary.receipts} {data.summary.receipts === 1 ? "receipt" : "receipts"}
          </summary>
          <div className="space-y-3 border-t border-amber-100 p-3 sm:p-4">
            <SyncIncidentList incidents={data.incidents} />
            {pagerSlot}
          </div>
        </details>
      )}
    </div>
  );
}

export function SyncIncidentAlerts({
  result,
  filtersSlot,
  pagerSlot,
}: {
  result: MobileSyncIncidentsResult;
  filtersSlot?: ReactNode;
  pagerSlot?: ReactNode;
}) {
  if (result.ok) {
    return (
      <SuccessPanel
        data={result.data}
        filtersSlot={filtersSlot}
        pagerSlot={pagerSlot}
      />
    );
  }

  const denied = result.kind === "not_authorized";
  return (
    <div
      role="alert"
      data-testid={
        denied
          ? "mobile-sync-incident-alerts-denied"
          : "mobile-sync-incident-alerts-unavailable"
      }
      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <h2 className="font-semibold text-slate-900">Sync incident alerts</h2>
          <p className="mt-1 text-sm text-slate-700">{result.message}</p>
          {!denied ? (
            <>
              <p className="mt-1 text-xs text-slate-500">
                The separate User Health evidence remains valid.
              </p>
              {filtersSlot ? <div className="mt-3">{filtersSlot}</div> : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
