import type {
  MobileSyncIncidentItem,
  MobileSyncIncidentKind,
  MobileSyncIncidentReceipt,
} from "./types";
import { timestampMicros } from "./timestamps";

export const INCIDENT_KIND_COPY: Record<
  MobileSyncIncidentKind,
  { label: string; explanation: string }
> = {
  support_root: {
    label: "Saved-change support receipt",
    explanation:
      "The phone reported that this mutation was in a support state when the receipt was created. Verify current local and backend state separately.",
  },
  integrity_aggregate: {
    label: "Sync-integrity finding reported",
    explanation:
      "The phone reported this integrity reason at the device-observed time. It may since have been reviewed or changed.",
  },
  queue_overflow: {
    label: "Diagnostic reporting coverage constrained",
    explanation:
      "At least one local source could not be represented or retained. Capacity and invalid or unencodable input are both possible.",
  },
};

export const LEGACY_INTEGRITY_SUMMARY_LABEL = "Legacy integrity receipts";
export const EFFECTIVE_CONDITION_SUMMARY_LABEL =
  "Latest condition snapshots in the selected window";

const CLASSIFICATION_COPY: Readonly<Record<string, string>> = {
  row_rejected: "The server rejected the saved-change upload.",
  rpc_rejected: "The device recorded a rejected sync acknowledgement.",
  ack_malformed: "The device recorded a malformed sync acknowledgement.",
  ack_identity_mismatch:
    "The acknowledgement identity did not match the saved mutation.",
  missing_outbox_slot:
    "The device found local unsynced state without its expected outbox slot.",
  missing_domain_row:
    "The device found an outbox reference whose local domain row was unavailable.",
  invalid_upload_identity:
    "The device found a saved change with invalid upload identity.",
  domain_newer_than_outbox:
    "The local domain row was newer than the durable mutation envelope.",
  local_incident_queue_capacity:
    "At least one source could not be represented or retained in the bounded diagnostic queue.",
};

const SAST_FORMAT = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatSastTimestamp(value: string | null): string {
  return value === null ? "None received" : `${SAST_FORMAT.format(new Date(value))} SAST`;
}

export function shortenActorUuid(value: string): string {
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function getIncidentClassification(
  receipt: MobileSyncIncidentReceipt
): string {
  const token =
    receipt.incident_kind === "integrity_aggregate"
      ? receipt.reason
      : receipt.error_code;
  return token && Object.prototype.hasOwnProperty.call(CLASSIFICATION_COPY, token)
    ? CLASSIFICATION_COPY[token]
    : "The receipt contains a bounded technical classification for investigation.";
}

export function wasReceivedAfterDeviceObservation(
  receipt: MobileSyncIncidentReceipt
): boolean {
  return timestampMicros(receipt.received_at) > timestampMicros(receipt.first_seen_at);
}

export function getIncidentIdentity(item: MobileSyncIncidentItem): string {
  return `${item.receipt.actor_user_id}:${item.receipt.incident_key}`;
}

export function getConditionSnapshotDetails(
  receipt: MobileSyncIncidentReceipt
): null | {
  installedStream: string;
  affectedRecords: number;
  occurrences: number;
  firstObservation: string;
  lastObservation: string;
  generation: number;
} {
  if (receipt.schema_version !== 3) return null;
  return {
    installedStream: receipt.client_stream_id,
    affectedRecords: receipt.affected_record_count,
    occurrences: receipt.occurrence_count,
    firstObservation: receipt.first_seen_at,
    lastObservation: receipt.last_seen_at,
    generation: receipt.report_generation,
  };
}
