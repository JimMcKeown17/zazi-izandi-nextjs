import type { MobileSyncIncidentsResponse } from "./types";

export const ACTOR_ID = "00000000-0000-4000-8000-000000000001";
export const MUTATION_ID = "00000000-0000-4000-8000-000000000002";
export const LOCAL_RECORD_ID = "00000000-0000-4000-8000-000000000003";
export const STREAM_ID = "00000000-0000-4000-8000-000000000004";
export const SCHOOL_ID = "00000000-0000-4000-8000-000000000010";

export const VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD: MobileSyncIncidentsResponse = {
  schema_version: 1,
  generated_at: "2026-08-14T12:00:00Z",
  applied_filters: {
    days: 7,
    start_at: "2026-08-07T22:00:00Z",
    end_at: "2026-08-14T22:00:00Z",
    snapshot_received_before: "2026-08-14T12:00:00Z",
    school_id: null,
    actor_user_id: null,
    incident_kind: null,
    descriptor_key: null,
    limit: 50,
  },
  summary: {
    receipts: 1,
    affected_users: 1,
    support_roots: 1,
    integrity_findings: 0,
    coverage_constrained: 0,
    newest_received_at: "2026-08-14T11:58:00Z",
  },
  page_count: 1,
  next_cursor: null,
  incidents: [
    {
      actor: {
        user_id: ACTOR_ID,
        display_name: "Fixture EA",
        display_name_source: "roster",
        current_school_id: SCHOOL_ID,
        current_school: "Fixture Primary School",
      },
      receipt: {
        schema_version: 1,
        actor_user_id: ACTOR_ID,
        incident_key: `support:v1:${MUTATION_ID}`,
        incident_kind: "support_root",
        descriptor_key: "TIME_ENTRIES",
        local_record_id: LOCAL_RECORD_ID,
        mutation_id: MUTATION_ID,
        client_stream_id: STREAM_ID,
        client_generation: 1,
        audit_sequence: 42,
        operation: "insert",
        source_status: "support_needed",
        attempt_count: 2,
        uncertain_attempt_count: 0,
        error_class: "rejected_deterministic",
        error_code: "row_rejected",
        reason: null,
        detail_kind: null,
        detail_code: null,
        first_seen_at: "2026-08-14T11:55:00.000Z",
        last_seen_at: "2026-08-14T11:55:00.000Z",
        occurrence_count: 1,
        app_version: "1.1.1",
        build_number: "19",
        runtime_version: "1.1.1",
        platform: "ios",
        os_version: "18.0",
        device_model: "iPhone",
        payload_sha256:
          "0000000000000000000000000000000000000000000000000000000000000000",
        received_at: "2026-08-14T11:58:00Z",
      },
    },
  ],
};
