export type ProgrammeFidelityAttention =
  | "all"
  | "current"
  | "above"
  | "unscored"
  | "inactive";

export interface ProgrammeFidelityFilters {
  schoolId: string | null;
  eaUserId: string | null;
  attention: ProgrammeFidelityAttention;
}

export interface ProgrammeFidelityExpansion {
  groupId: string;
  eaUserId: string;
}

export interface ProgrammeFidelityAppliedFilters {
  school_id: string | null;
  ea_user_id: string | null;
  attention: ProgrammeFidelityAttention;
}

export type ProgrammeFidelityPrimaryReason =
  | "TEACHING_AHEAD_OF_FRONTIER"
  | "RECENT_ACTIVITY_UNSCORABLE"
  | "NO_RECENT_MOBILE_SESSION"
  | "CURRENT_TRACKER_COVERAGE_LOW"
  | "BOOTSTRAP_HISTORY_LIMITED"
  | "UNKNOWN_LANGUAGE"
  | "UNKNOWN_ASSESSMENT_FORM"
  | "INVALID_SESSION_LETTERS"
  | "SOURCE_DATA_INCOMPLETE"
  | "NO_IMMEDIATE_FLAG";

export type ProgrammeFidelityAdviceReason =
  | "empty"
  | "unknown_language"
  | "day_one"
  | "low_coverage"
  | "terminal"
  | "ok";

export interface ProgrammeFidelityFreshness {
  compute_completed_at: string;
  source_generated_at: string;
  last_failed_at: string | null;
  is_stale: boolean;
}

export interface ProgrammeFidelityReason {
  code: ProgrammeFidelityPrimaryReason;
  title: string;
  observation: string;
  recommended_check: string;
}

export interface ProgrammeFidelityRow {
  group_id: string;
  ea_user_id: string;
  group_name: string;
  ea_display_name: string;
  school_id: string | null;
  school_name: string | null;
  school_type: string | null;
  class_id: string | null;
  class_name: string | null;
  is_current_owner: boolean;
  calculation_date: string;
  activity_date_from: string;
  activity_date_to: string;
  recent_session_count: number;
  last_session_date: string | null;
  roster_size: number | null;
  started_count: number | null;
  tracker_coverage: number | null;
  advice_reason: ProgrammeFidelityAdviceReason | null;
  introduce_letters: string[] | null;
  primary_reason: ProgrammeFidelityPrimaryReason;
  reason: ProgrammeFidelityReason;
  supporting_reasons: Array<{ code: string; observation: string }>;
  alignment_status:
    | "not_yet_available"
    | "no_eligible_sessions"
    | "partial"
    | "scored";
  data_quality_counts: {
    invalid_session_letter_count: number;
    unknown_language_count: number;
    unknown_assessment_form_count: number;
    assessment_recency_tie_count: number;
    source_data_incomplete_count: number;
  };
  alignment_scored_through_date: string | null;
  aligned_count: number | null;
  below_count: number | null;
  above_count: number | null;
  unscored_count: number | null;
  scored_n: number | null;
  score: number | null;
  causal_post_install_count: number | null;
  bootstrap_influenced_count: number | null;
  client_clock_count: number | null;
  server_clock_count: number | null;
  bootstrap_clock_count: number | null;
}

export interface ProgrammeFidelityResponse {
  schema_version: 1;
  calculation_version: string;
  window_days: 14;
  activity_through_date: string | null;
  alignment_scored_through_date: string | null;
  alignment_availability: {
    status: "not_yet_available" | "partial" | "available";
    ledger_installed_at: string;
    last_complete_event_run_finished_at: string | null;
    scored_through_date: string | null;
    message: string;
  };
  applied_filters: ProgrammeFidelityAppliedFilters;
  freshness: ProgrammeFidelityFreshness;
  history_quality: {
    status: "current_state_only" | "causal_history_available";
    causal_session_count: number | null;
    bootstrap_influenced_count: number | null;
  };
  aggregates: {
    groups_needing_attention: number;
    active_groups: number;
    inactive_groups: number;
    tracker_started_count: number;
    tracker_roster_size: number;
    tracker_coverage: number | null;
  };
  data_quality: ProgrammeFidelityRow["data_quality_counts"] & {
    unattributed_session_count: number;
  };
  filter_options: {
    schools: Array<{ id: string; name: string }>;
    eas: Array<{ id: string; name: string }>;
  };
  rows: ProgrammeFidelityRow[];
}

export type ProgrammeFidelityInstanceReason =
  | "PRE_LEDGER_NO_CAUSAL_HISTORY"
  | "ALIGNMENT_NOT_YET_AVAILABLE"
  | "PENDING_EVIDENCE_SETTLEMENT"
  | "UNKNOWN_LANGUAGE"
  | "UNKNOWN_ASSESSMENT_FORM"
  | "SOURCE_DATA_INCOMPLETE"
  | "INVALID_SESSION_LETTERS"
  | "LOW_TRACKER_COVERAGE"
  | "EMPTY_ROSTER";

export interface ProgrammeFidelitySessionResponse {
  schema_version: 1;
  calculation_version: string;
  window_days: 14;
  applied_filters: {
    group_id: string;
    ea_user_id: string;
    window_days: 14;
    activity_date_from: string;
    activity_date_to: string;
    alignment_date_from: string;
    alignment_date_to: string;
    union_date_from: string;
    union_date_to: string;
  };
  freshness: ProgrammeFidelityFreshness;
  sessions: Array<{
    session_id: string;
    session_date: string;
    session_time_quality: "started_at" | "date_fallback";
    alignment_status:
      | "pre_ledger"
      | "not_yet_available"
      | "pending_settlement"
      | "evaluated";
    reason_code: ProgrammeFidelityInstanceReason;
    historical_frontier: string[] | null;
    historical_roster_size: number | null;
    historical_started_count: number | null;
    history_quality:
      | "causal_post_install"
      | "bootstrap_influenced"
      | null;
    clock_quality_counts: {
      client: number;
      server: number;
      bootstrap: number;
    } | null;
    letters: Array<{
      letter: string;
      band: "aligned" | "below" | "above" | "unscored" | "pending";
    }>;
  }>;
}

export type ProgrammeFidelityFailureKind =
  | "invalid_filters"
  | "not_authenticated"
  | "not_authorized"
  | "not_found"
  | "not_computed"
  | "unavailable";

export type ProgrammeFidelityResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      kind: ProgrammeFidelityFailureKind;
      message: string;
    };
