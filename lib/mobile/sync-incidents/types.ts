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

export interface MobileSyncIncidentReceipt {
  schema_version: 1;
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

export interface MobileSyncIncidentItem {
  actor: MobileSyncIncidentActor;
  receipt: MobileSyncIncidentReceipt;
}

export interface MobileSyncIncidentsResponse {
  schema_version: 1;
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
  summary: {
    receipts: number;
    affected_users: number;
    support_roots: number;
    integrity_findings: number;
    coverage_constrained: number;
    newest_received_at: string | null;
  };
  page_count: number;
  next_cursor: string | null;
  incidents: MobileSyncIncidentItem[];
}

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
