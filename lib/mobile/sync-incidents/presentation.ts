import type {
  MobileSyncIncidentItem,
  MobileSyncIncidentKind,
  MobileSyncIncidentReceipt,
} from "./types";

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
  return (
    (token ? CLASSIFICATION_COPY[token] : null) ??
    "The receipt contains a bounded technical classification for investigation."
  );
}

export function getIncidentIdentity(item: MobileSyncIncidentItem): string {
  return `${item.receipt.actor_user_id}:${item.receipt.incident_key}`;
}

export function serverReceiptWasDelayed(
  receipt: MobileSyncIncidentReceipt
): boolean {
  return Date.parse(receipt.received_at) > Date.parse(receipt.first_seen_at);
}

