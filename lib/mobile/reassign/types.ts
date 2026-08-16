export type MobileReassignScope = "roster" | "class";
export type MobileReassignEntityKind = "class" | "group" | "child";
export type MobileReassignEntitySource = "ledger" | "scalar_only";
export type MobileReassignUnresolvedReason =
  | "parent_misaligned"
  | "class_membership_orphan";
export type MobileReassignDecision = "move" | "leave";

export interface MobileReassignRosterEntity {
  entity_kind: MobileReassignEntityKind;
  entity_id: string;
  name: string;
  parent_class_id: string | null;
  expected_assignment_id: string | null;
  source: MobileReassignEntitySource;
}

export interface MobileReassignUnresolvedEntity extends MobileReassignRosterEntity {
  reason: MobileReassignUnresolvedReason;
}

export interface MobileReassignRosterPreview {
  from_ea: string;
  from_ea_name: string;
  scope: MobileReassignScope;
  scope_class_id: string | null;
  classes: MobileReassignRosterEntity[];
  groups: MobileReassignRosterEntity[];
  children: MobileReassignRosterEntity[];
  scalar_only: MobileReassignRosterEntity[];
  unresolved: MobileReassignUnresolvedEntity[];
  source_counts: {
    class_ledger_active: number;
    group_ledger_active: number;
    child_ledger_active: number;
    scalar_class_rows: number;
    scalar_group_rows: number;
  };
  counts: {
    classes: number;
    groups: number;
    children: number;
    scalar_only: number;
    unresolved: number;
  };
}

export type MobileHandoverJobStatus =
  | "created"
  | "running"
  | "complete"
  | "complete_with_refusals"
  | "complete_with_exclusions"
  | "needs_repreview"
  | "integrity_fault";

export type MobileHandoverItemState =
  | "pending"
  | "transferred"
  | "refused"
  | "stale"
  | "error"
  | "excluded";

export type MobileHandoverRefusalCode =
  | "target_name_collision"
  | "shared_class_unsupported"
  | "entity_archived"
  | "no_current_holder"
  | "claimant_ambiguous"
  | "cas_conflict"
  | "no_active_assignment"
  | "group_class_holder_mismatch"
  | "entity_not_found"
  | "target_ea_not_found"
  | "seed_lease_busy"
  | "request_id_reuse_mismatch"
  | "from_equals_to"
  | "timeout"
  | "upstream_unavailable"
  | "parent_stale_veto"
  | "operator_left_behind"
  | "malformed_wrapper_result";

export interface MobileHandoverJob {
  id: string;
  status: MobileHandoverJobStatus;
  retryable: boolean;
  in_flight: boolean;
  scope: MobileReassignScope;
  scope_class_id: string | null;
  from_ea_user_id: string;
  to_ea_user_id: string;
  reason: string;
  requested_by: { clerk_user_id: string; email: string };
  progress_cursor: number;
  total_items: number;
  created_at: string | null;
  updated_at: string | null;
  summary: string;
}

export interface MobileHandoverItem {
  position: number;
  entity_kind: MobileReassignEntityKind;
  entity_id: string;
  parent_class_id: string | null;
  state: MobileHandoverItemState;
  refusal_code: MobileHandoverRefusalCode | "";
  message: string;
  expected_assignment_id: string | null;
  remaining_foreign_claims: number | null;
  result: Record<string, unknown>;
}

export interface MobileHandoverJobResponse {
  job: MobileHandoverJob;
  items: MobileHandoverItem[];
}

export type MobileReassignErrorCode =
  | "scope_class_not_owned"
  | "handover_lease_busy"
  | "handover_job_already_active"
  | "mobile_handover_unavailable"
  | "mobile_handover_roster_too_large"
  | "mobile_handover_timeout"
  | "invalid_handover_request"
  | "unresolved_decisions_required"
  | "successor_not_eligible"
  | "integrity_fault"
  | "handover_job_not_found"
  // Client-side only: the continuation runner stopped a retryable loop that
  // made no semantic progress (never produced by the response decoder).
  | "handover_stalled";

export type MobileReassignResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      code: MobileReassignErrorCode | "malformed_response";
      message: string;
    };

export interface MobileReassignCreateJobInput {
  fromEa: string;
  toEa: string;
  scope: MobileReassignScope;
  scopeClassId?: string | null;
  reason: string;
  unresolvedDecisions?: Array<{
    entityKind: MobileReassignEntityKind;
    entityId: string;
    decision: MobileReassignDecision;
  }>;
}
