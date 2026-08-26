import { createServer } from "node:http";

const host = "127.0.0.1";
const port = 4011;
const ids = {
  school: "00000000-0000-4000-8000-000000000010",
  ea: "00000000-0000-4000-8000-000000000020",
  formerEa: "00000000-0000-4000-8000-000000000021",
  inactiveEa: "00000000-0000-4000-8000-000000000022",
  group: "00000000-0000-4000-8000-000000000030",
  inactiveGroup: "00000000-0000-4000-8000-000000000031",
  class: "00000000-0000-4000-8000-000000000040",
};

const freshness = {
  compute_completed_at: "2026-08-25T12:05:00+00:00",
  source_generated_at: "2026-08-25T12:00:00+00:00",
  last_failed_at: null,
  is_stale: false,
};
const quality = {
  invalid_session_letter_count: 0,
  unknown_language_count: 0,
  unknown_assessment_form_count: 0,
  assessment_recency_tie_count: 0,
  source_data_incomplete_count: 0,
};
const causalUnavailable = {
  alignment_status: "not_yet_available",
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

const current = {
  group_id: ids.group,
  ea_user_id: ids.ea,
  group_name: "Group 1 — a deliberately long coaching label for responsive proof",
  ea_display_name: "Coach One",
  school_id: ids.school,
  school_name: "School One, Central Campus",
  school_type: "primary",
  class_id: ids.class,
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
    recommended_check: "Check that the EA is assessing or recording taught letters for the current group.",
  },
  supporting_reasons: [],
  data_quality_counts: quality,
  ...causalUnavailable,
};

const rows = [
  current,
  {
    ...current,
    ea_user_id: ids.formerEa,
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
  },
  {
    ...current,
    group_id: ids.inactiveGroup,
    ea_user_id: ids.inactiveEa,
    group_name: "+SUM(1,2) Foundation Group",
    ea_display_name: "=HYPERLINK(\"https://invalid.example\")",
    recent_session_count: 0,
    last_session_date: null,
    roster_size: 8,
    started_count: 8,
    tracker_coverage: 1,
    advice_reason: "ok",
    introduce_letters: ["s", "l"],
    primary_reason: "NO_RECENT_MOBILE_SESSION",
    reason: {
      code: "NO_RECENT_MOBILE_SESSION",
      title: "No recent mobile session",
      observation: "No mobile literacy session is attributed to this EA and group in the last 14 days.",
      recommended_check: "Check the sessions page and confirm whether teaching or syncing needs support.",
    },
  },
];

function filteredRows(url) {
  let selected = rows;
  const schoolId = url.searchParams.get("school_id");
  const eaUserId = url.searchParams.get("ea_user_id");
  const attention = url.searchParams.get("attention") ?? "all";
  if (schoolId) selected = selected.filter((row) => row.school_id === schoolId);
  if (eaUserId) selected = selected.filter((row) => row.ea_user_id === eaUserId);
  if (attention === "current") {
    selected = selected.filter((row) => [
      "CURRENT_TRACKER_COVERAGE_LOW",
      "UNKNOWN_LANGUAGE",
      "UNKNOWN_ASSESSMENT_FORM",
      "SOURCE_DATA_INCOMPLETE",
    ].includes(row.primary_reason));
  } else if (attention === "inactive") {
    selected = selected.filter((row) => row.recent_session_count === 0);
  } else if (attention === "above" || attention === "unscored") {
    selected = [];
  }
  return { selected, schoolId, eaUserId, attention };
}

function aggregate(url) {
  const { selected, schoolId, eaUserId, attention } = filteredRows(url);
  const owners = selected.filter((row) => row.is_current_owner);
  const roster = owners.reduce((sum, row) => sum + (row.roster_size ?? 0), 0);
  const started = owners.reduce((sum, row) => sum + (row.started_count ?? 0), 0);
  return {
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
    applied_filters: {
      school_id: schoolId,
      ea_user_id: eaUserId,
      attention,
    },
    freshness,
    history_quality: {
      status: "current_state_only",
      causal_session_count: null,
      bootstrap_influenced_count: null,
    },
    aggregates: {
      groups_needing_attention: owners.filter((row) => row.primary_reason !== "NO_IMMEDIATE_FLAG").length,
      active_groups: owners.filter((row) => row.recent_session_count > 0).length,
      inactive_groups: owners.filter((row) => row.recent_session_count === 0).length,
      tracker_started_count: started,
      tracker_roster_size: roster,
      tracker_coverage: roster ? started / roster : null,
    },
    data_quality: { ...quality, unattributed_session_count: 2 },
    filter_options: {
      schools: [{ id: ids.school, name: "School One, Central Campus" }],
      eas: [
        { id: ids.ea, name: "Coach One" },
        { id: ids.formerEa, name: "Coach Former" },
        { id: ids.inactiveEa, name: "=HYPERLINK(\"https://invalid.example\")" },
      ],
    },
    rows: selected,
  };
}

function sessions(url) {
  const groupId = url.searchParams.get("group_id");
  const eaUserId = url.searchParams.get("ea_user_id");
  return {
    schema_version: 1,
    calculation_version: "mobile_fidelity_current_state_v1_1",
    window_days: 14,
    applied_filters: {
      group_id: groupId,
      ea_user_id: eaUserId,
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
}

function send(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "private, no-store",
  });
  response.end(JSON.stringify(body));
}

createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);
  if (url.pathname === "/health") return send(response, 200, { ok: true });
  if (!request.headers.authorization?.startsWith("Bearer ")) {
    return send(response, 401, { error: "unauthorized" });
  }
  if (request.headers["x-internal-auth"] !== "offline-mobile-contract-test-secret") {
    return send(response, 403, { error: "forbidden" });
  }
  if (url.pathname === "/api/mobile/programme-fidelity/" && request.method === "GET") {
    return send(response, 200, aggregate(url));
  }
  if (url.pathname === "/api/mobile/programme-fidelity/sessions/" && request.method === "GET") {
    return send(response, 200, sessions(url));
  }
  return send(response, 404, { error: "programme fidelity route not found" });
}).listen(port, host);
