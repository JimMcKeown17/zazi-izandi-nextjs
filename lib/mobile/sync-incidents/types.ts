export type MobileSyncIncidentKind =
  | "support_root"
  | "integrity_aggregate"
  | "queue_overflow";

export interface MobileSyncIncidentFilters {
  days: number;
  schoolId?: string | null;
  incidentKind?: MobileSyncIncidentKind | null;
  descriptorKey?: string | null;
  limit: number;
  cursor?: string | null;
}

export type MobileSyncIncidentOperation =
  | "insert"
  | "update"
  | "archive"
  | "hard_delete"
  | "restore";

export type MobileSyncIncidentErrorClass =
  | "row"
  | "transport"
  | "service"
  | "unknown"
  | "auth"
  | "rejected_deterministic"
  | "malformed"
  | "integrity"
  | "queue";

export type MobileSyncIntegrityReason =
  | "audit_zero_unsynced"
  | "missing_outbox_slot"
  | "missing_domain_row"
  | "invalid_upload_identity"
  | "domain_newer_than_outbox"
  | "rpc_rejected"
  | "ack_malformed"
  | "ack_identity_mismatch"
  | "pull_drop_deferred"
  | "pull_drop_quarantined";

export interface MobileSyncIncidentActor {
  user_id: string;
  display_name: string;
  display_name_source: "roster" | "identity" | "uuid";
  current_school_id: string | null;
  current_school: string | null;
}

interface MobileSyncIncidentReceiptFields {
  actor_user_id: string;
  incident_key: string;
  incident_kind: MobileSyncIncidentKind;
  descriptor_key: string | null;
  local_record_id: string | null;
  mutation_id: string | null;
  client_stream_id: string | null;
  client_generation: number;
  audit_sequence: number;
  operation: MobileSyncIncidentOperation | null;
  source_status: "support_needed" | "terminal" | null;
  attempt_count: number;
  uncertain_attempt_count: number;
  error_class: MobileSyncIncidentErrorClass;
  error_code: string | null;
  reason: MobileSyncIntegrityReason | null;
  detail_kind: string | null;
  detail_code: string | null;
  first_seen_at: string;
  last_seen_at: string;
  occurrence_count: number;
  app_version: string | null;
  build_number: string | null;
  runtime_version: string | null;
  platform: "android" | "ios" | "web" | "unknown";
  os_version: string | null;
  device_model: string | null;
  payload_sha256: string;
  received_at: string;
}

export interface MobileSyncIncidentReceiptV1
  extends MobileSyncIncidentReceiptFields {
  schema_version: 1;
}

export interface MobileSyncIncidentReceiptV2
  extends MobileSyncIncidentReceiptFields {
  schema_version: 2;
  observed_release_label: string | null;
  observed_update_id: string | null;
  observed_is_embedded_launch: boolean | null;
}

export interface MobileSyncIncidentReceiptV3
  extends MobileSyncIncidentReceiptFields {
  schema_version: 3;
  client_stream_id: string;
  observed_release_label: string | null;
  observed_update_id: string | null;
  observed_is_embedded_launch: boolean | null;
  condition_key: string;
  report_generation: number;
  affected_record_count: number;
}

export type MobileSyncIncidentReceipt =
  | MobileSyncIncidentReceiptV1
  | MobileSyncIncidentReceiptV2
  | MobileSyncIncidentReceiptV3;

export interface MobileSyncIncidentItem {
  actor: MobileSyncIncidentActor;
  receipt: MobileSyncIncidentReceipt;
}

export interface MobileSyncIncidentLegacySummary {
  receipts: number;
  affected_users: number;
  support_roots: number;
  integrity_findings: number;
  coverage_constrained: number;
  newest_received_at: string | null;
}

export interface MobileSyncIncidentSuccessorSummary {
  receipts: number;
  affected_users: number;
  support_roots: number;
  legacy_receipts: number;
  effective_v3_conditions: number;
  coverage_constrained: number;
  newest_received_at: string | null;
}

interface MobileSyncIncidentsResponseFields {
  generated_at: string;
  applied_filters: {
    days: number;
    start_at: string;
    end_at: string;
    snapshot_received_before: string;
    school_id: string | null;
    actor_user_id: null;
    incident_kind: MobileSyncIncidentKind | null;
    descriptor_key: string | null;
    limit: number;
  };
  page_count: number;
  next_cursor: string | null;
}

export interface MobileSyncIncidentsResponseV1
  extends MobileSyncIncidentsResponseFields {
  schema_version: 1;
  summary: MobileSyncIncidentLegacySummary;
  incidents: Array<
    MobileSyncIncidentItem & { receipt: MobileSyncIncidentReceiptV1 }
  >;
}

export interface MobileSyncIncidentsResponseV2
  extends MobileSyncIncidentsResponseFields {
  schema_version: 2;
  summary: MobileSyncIncidentLegacySummary | MobileSyncIncidentSuccessorSummary;
  incidents: MobileSyncIncidentItem[];
}

export type MobileSyncIncidentsResponse =
  | MobileSyncIncidentsResponseV1
  | MobileSyncIncidentsResponseV2;

export type MobileSyncIncidentsResult =
  | { ok: true; data: MobileSyncIncidentsResponse }
  | {
      ok: false;
      status: number;
      kind:
        | "invalid_filters"
        | "not_authorized"
        | "stale_cursor"
        | "unavailable";
      message: string;
    };
