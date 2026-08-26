import type {
  ProgrammeFidelityResponse,
  ProgrammeFidelityRow,
  ProgrammeFidelitySessionResponse,
} from "./types";

export const SCHOOL_ID = "00000000-0000-4000-8000-000000000010";
export const EA_ID = "00000000-0000-4000-8000-000000000020";
export const GROUP_ID = "00000000-0000-4000-8000-000000000030";
export const FORMER_EA_ID = "00000000-0000-4000-8000-000000000021";

const freshness = {
  compute_completed_at: "2026-08-25T12:05:00+00:00",
  source_generated_at: "2026-08-25T12:00:00+00:00",
  last_failed_at: null,
  is_stale: false,
} as const;

const zeroQuality = {
  invalid_session_letter_count: 0,
  unknown_language_count: 0,
  unknown_assessment_form_count: 0,
  assessment_recency_tie_count: 0,
  source_data_incomplete_count: 0,
};

const causalUnavailable = {
  alignment_status: "not_yet_available" as const,
  alignment_scored_through_date: null,
  aligned_count: null,
  below_count: null,
  above_count: null,
  unscored_count: null,
  scored_n: null,
  score: null,
  causal_post_install_count: null,
  bootstrap_influenced_count: null,
  client_clock_count: null,
  server_clock_count: null,
  bootstrap_clock_count: null,
};

const currentRow: ProgrammeFidelityRow = {
  group_id: GROUP_ID,
  ea_user_id: EA_ID,
  group_name: "Group 1",
  ea_display_name: "Coach One",
  school_id: SCHOOL_ID,
  school_name: "School One",
  school_type: "primary",
  class_id: "00000000-0000-4000-8000-000000000040",
  class_name: "Class A",
  is_current_owner: true,
  calculation_date: "2026-08-25",
  activity_date_from: "2026-08-12",
  activity_date_to: "2026-08-25",
  recent_session_count: 3,
  last_session_date: "2026-08-25",
  roster_size: 5,
  started_count: 2,
  tracker_coverage: 0.4,
  advice_reason: "low_coverage",
  introduce_letters: ["m", "a"],
  primary_reason: "CURRENT_TRACKER_COVERAGE_LOW",
  reason: {
    code: "CURRENT_TRACKER_COVERAGE_LOW",
    title: "Letter tracker coverage is still low",
    observation: "Fewer than half of the current roster have letter evidence in the tracker.",
    recommended_check: "Check that the EA is assessing children or recording letters each child has mastered.",
  },
  supporting_reasons: [],
  data_quality_counts: zeroQuality,
  ...causalUnavailable,
};

const formerRow: ProgrammeFidelityRow = {
  ...currentRow,
  ea_user_id: FORMER_EA_ID,
  ea_display_name: "Coach Former",
  is_current_owner: false,
  recent_session_count: 1,
  last_session_date: "2026-08-18",
  roster_size: null,
  started_count: null,
  tracker_coverage: null,
  advice_reason: null,
  introduce_letters: null,
  primary_reason: "NO_IMMEDIATE_FLAG",
  reason: {
    code: "NO_IMMEDIATE_FLAG",
    title: "No immediate flag",
    observation: "No higher-priority current-state attention reason applies to this row.",
    recommended_check: "Use recent sessions as context; historical alignment is not yet calculated.",
  },
};

export const VALID_PROGRAMME_FIDELITY_PAYLOAD: ProgrammeFidelityResponse = {
  schema_version: 1,
  calculation_version: "mobile_fidelity_current_state_v1_1",
  window_days: 14,
  activity_through_date: "2026-08-25",
  alignment_scored_through_date: null,
  alignment_availability: {
    status: "not_yet_available",
    ledger_installed_at: "2026-08-25T15:30:08.234775+00:00",
    last_complete_event_run_finished_at: null,
    scored_through_date: null,
    message: "Current guidance and recent activity are available; historical alignment is not yet calculated.",
  },
  applied_filters: { school_id: null, ea_user_id: null, attention: "all" },
  freshness,
  history_quality: {
    status: "current_state_only",
    causal_session_count: null,
    bootstrap_influenced_count: null,
  },
  aggregates: {
    groups_needing_attention: 1,
    active_groups: 1,
    inactive_groups: 0,
    tracker_started_count: 2,
    tracker_roster_size: 5,
    tracker_coverage: 0.4,
  },
  data_quality: { ...zeroQuality, unattributed_session_count: 2 },
  filter_options: {
    schools: [{ id: SCHOOL_ID, name: "School One" }],
    eas: [
      { id: EA_ID, name: "Coach One" },
      { id: FORMER_EA_ID, name: "Coach Former" },
    ],
  },
  rows: [currentRow, formerRow],
};

export const VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD: ProgrammeFidelitySessionResponse = {
  schema_version: 1,
  calculation_version: "mobile_fidelity_current_state_v1_1",
  window_days: 14,
  applied_filters: {
    group_id: GROUP_ID,
    ea_user_id: EA_ID,
    window_days: 14,
    activity_date_from: "2026-08-12",
    activity_date_to: "2026-08-25",
    alignment_date_from: "2026-08-11",
    alignment_date_to: "2026-08-24",
    union_date_from: "2026-08-11",
    union_date_to: "2026-08-25",
  },
  freshness,
  sessions: [
    {
      session_id: "00000000-0000-4000-8000-000000000050",
      session_date: "2026-08-25",
      session_time_quality: "started_at",
      alignment_status: "not_yet_available",
      reason_code: "ALIGNMENT_NOT_YET_AVAILABLE",
      historical_frontier: null,
      historical_roster_size: null,
      historical_started_count: null,
      history_quality: null,
      clock_quality_counts: null,
      letters: [{ letter: "m", band: "unscored" }],
    },
    {
      session_id: "00000000-0000-4000-8000-000000000051",
      session_date: "2026-08-11",
      session_time_quality: "date_fallback",
      alignment_status: "pre_ledger",
      reason_code: "PRE_LEDGER_NO_CAUSAL_HISTORY",
      historical_frontier: null,
      historical_roster_size: null,
      historical_started_count: null,
      history_quality: null,
      clock_quality_counts: null,
      letters: [],
    },
  ],
};
