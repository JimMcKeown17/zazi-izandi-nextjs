import { createServer } from "node:http";

const host = "127.0.0.1";
const port = 4012;
let mode = "success";
let requestLog = [];

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const uuid = (suffix) => `00000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
const quality = {
  invalid_session_letter_count: 0,
  unknown_language_count: 0,
  unknown_assessment_form_count: 0,
  assessment_recency_tie_count: 0,
  source_data_incomplete_count: 0,
};
const freshness = {
  compute_completed_at: "2026-08-28T12:05:00+00:00",
  source_generated_at: "2026-08-28T12:00:00+00:00",
  last_failed_at: null,
  is_stale: false,
};

function focus({ focused = 0, mixed = 0, ahead = 0, unscored = 0, sum = 0, score = null }) {
  return {
    focused_session_count: focused,
    mixed_session_count: mixed,
    ahead_only_session_count: ahead,
    unscored_session_count: unscored,
    eligible_session_count: focused + mixed + ahead,
    session_value_sum: sum,
    score,
  };
}

function row({
  group,
  ea,
  name,
  school,
  schoolType = "primary",
  recent = 2,
  roster = 6,
  started = 4,
  primaryReason = "NO_IMMEDIATE_FLAG",
  aligned = 1,
  below = 0,
  above = 0,
  unscored = 0,
  legacyScore = 100,
  letterFocus = focus({ focused: 1, sum: 1, score: 100 }),
  causal = letterFocus.eligible_session_count + letterFocus.unscored_session_count,
  bootstrap = 0,
  current = true,
}) {
  const status = mode === "historical_fail" ? "scored" : "partial";
  const scoredN = aligned + below + above;
  return {
    group_id: uuid(group),
    ea_user_id: uuid(ea),
    group_name: `Group ${group} — a deliberately long responsive teaching label`,
    ea_display_name: name,
    school_id: uuid(100 + group),
    school_name: school,
    school_type: schoolType,
    class_id: uuid(200 + group),
    class_name: `Class ${group}`,
    is_current_owner: current,
    calculation_date: "2026-08-28",
    activity_date_from: "2026-08-15",
    activity_date_to: "2026-08-28",
    recent_session_count: recent,
    last_session_date: recent > 0 ? "2026-08-28" : null,
    roster_size: current ? roster : null,
    started_count: current ? started : null,
    tracker_coverage: current && roster > 0 ? started / roster : null,
    advice_reason: current ? "ok" : null,
    introduce_letters: current ? ["m", "a"] : null,
    primary_reason: primaryReason,
    reason: {
      code: primaryReason,
      title: primaryReason === "TEACHING_AHEAD_OF_FRONTIER" ? "Teaching may be ahead of recorded progress" : "No immediate group flag",
      observation: primaryReason === "TEACHING_AHEAD_OF_FRONTIER" ? "This group contains recent ahead evidence." : "No higher-priority current group reason applies.",
      recommended_check: "Inspect the group and session evidence before coaching.",
    },
    supporting_reasons: [],
    alignment_status: scoredN === 0 && unscored === 0 ? "no_eligible_sessions" : status,
    data_quality_counts: quality,
    alignment_scored_through_date: "2026-08-27",
    aligned_count: aligned,
    below_count: below,
    above_count: above,
    unscored_count: unscored,
    scored_n: scoredN,
    score: scoredN === 0 ? null : legacyScore,
    causal_post_install_count: causal,
    bootstrap_influenced_count: bootstrap,
    client_clock_count: causal,
    server_clock_count: 0,
    bootstrap_clock_count: bootstrap,
    letter_focus: letterFocus,
  };
}

function allRows() {
  return [
    row({ group: 1, ea: 1, name: "Nomvula Dlamini", school: "ABRAHAM LEVY", recent: 3, aligned: 1, below: 1, legacyScore: 75, letterFocus: focus({ focused: 1, mixed: 1, sum: 1.5, score: 75 }) }),
    row({ group: 2, ea: 1, name: "Nomvula Dlamini", school: "CANZIBE", recent: 2, primaryReason: "TEACHING_AHEAD_OF_FRONTIER", aligned: 1, above: 1, legacyScore: 50, letterFocus: focus({ mixed: 2, sum: 1, score: 50 }), causal: 1, bootstrap: 1 }),
    row({ group: 3, ea: 2, name: "Siyabonga Mbeki", school: "CEBELIHLE", recent: 6, aligned: 0, above: 1, legacyScore: 0, letterFocus: focus({ ahead: 6, sum: 0, score: 0 }), causal: 6 }),
    row({ group: 4, ea: 3, name: "A very long education assistant name for narrow-screen proof", school: "EMAFINI", recent: 1, aligned: 0, above: 0, unscored: 1, legacyScore: null, letterFocus: focus({ unscored: 1 }), causal: 1 }),
    row({ group: 5, ea: 4, name: "Lihle SEF", school: "KWANOXOLO", recent: 2, letterFocus: focus({ focused: 2, sum: 2, score: 100 }), causal: 2 }),
    row({ group: 6, ea: 5, name: "Ayanda ECD", school: "LUKHANYO", schoolType: "ecd", recent: 2, aligned: 1, above: 1, legacyScore: 50, letterFocus: focus({ mixed: 1, sum: 0.5, score: 50 }), causal: 1 }),
    row({ group: 7, ea: 6, name: "Unattributed Primary", school: "ASTRA", recent: 1 }),
    row({ group: 8, ea: 8, name: "Former owner", school: "ABRAHAM LEVY", recent: 1, aligned: 0, letterFocus: focus({}), causal: 0, current: false }),
  ];
}

function selectedRows(url) {
  let rows = allRows();
  const ea = url.searchParams.get("ea_user_id");
  const attention = url.searchParams.get("attention") ?? "all";
  if (ea) rows = rows.filter((item) => item.ea_user_id === ea);
  if (attention === "above") rows = rows.filter((item) => (item.above_count ?? 0) > 0);
  if (attention === "unscored") rows = rows.filter((item) => item.letter_focus?.unscored_session_count > 0);
  if (attention === "inactive") rows = rows.filter((item) => item.recent_session_count === 0);
  if (attention === "current") rows = rows.filter((item) => item.primary_reason === "CURRENT_TRACKER_COVERAGE_LOW");
  return { rows, ea, attention };
}

function aggregate(url) {
  const { rows, ea, attention } = selectedRows(url);
  const currentRows = rows.filter((item) => item.is_current_owner);
  const roster = currentRows.reduce((sum, item) => sum + (item.roster_size ?? 0), 0);
  const started = currentRows.reduce((sum, item) => sum + (item.started_count ?? 0), 0);
  const available = mode === "historical_fail";
  return {
    schema_version: 2,
    calculation_version: "mobile_fidelity_causal_alignment_v2",
    window_days: 14,
    activity_through_date: "2026-08-28",
    alignment_scored_through_date: "2026-08-27",
    alignment_availability: {
      status: available ? "available" : "partial",
      ledger_installed_at: "2026-08-18T10:00:00+00:00",
      last_complete_event_run_finished_at: "2026-08-28T12:01:00+00:00",
      scored_through_date: "2026-08-27",
      message: available ? "Recent teaching evidence is available through 2026-08-27." : "Recent teaching evidence is available for a partial window through 2026-08-27.",
    },
    applied_filters: { school_id: null, ea_user_id: ea, attention },
    freshness,
    history_quality: {
      status: "causal_history_available",
      causal_session_count: rows.reduce((sum, item) => sum + item.causal_post_install_count + item.bootstrap_influenced_count, 0),
      bootstrap_influenced_count: rows.reduce((sum, item) => sum + item.bootstrap_influenced_count, 0),
    },
    aggregates: {
      groups_needing_attention: currentRows.filter((item) => !["NO_IMMEDIATE_FLAG", "BOOTSTRAP_HISTORY_LIMITED"].includes(item.primary_reason)).length,
      active_groups: currentRows.filter((item) => item.recent_session_count > 0).length,
      inactive_groups: currentRows.filter((item) => item.recent_session_count === 0).length,
      tracker_started_count: started,
      tracker_roster_size: roster,
      tracker_coverage: roster > 0 ? started / roster : null,
    },
    data_quality: { ...quality, unattributed_session_count: 0 },
    filter_options: {
      schools: [...new Map(allRows().map((item) => [item.school_id, { id: item.school_id, name: item.school_name }])).values()],
      eas: [...new Map(allRows().map((item) => [item.ea_user_id, { id: item.ea_user_id, name: item.ea_display_name }])).values()],
    },
    rows,
  };
}

function sessions(url) {
  const available = mode === "historical_fail";
  return {
    schema_version: 2,
    calculation_version: "mobile_fidelity_causal_alignment_v2",
    window_days: 14,
    alignment_availability: { status: available ? "available" : "partial", scored_through_date: "2026-08-27" },
    applied_filters: {
      group_id: url.searchParams.get("group_id"),
      ea_user_id: url.searchParams.get("ea_user_id"),
      window_days: 14,
      activity_date_from: "2026-08-15",
      activity_date_to: "2026-08-28",
      alignment_date_from: "2026-08-14",
      alignment_date_to: "2026-08-27",
      union_date_from: "2026-08-14",
      union_date_to: "2026-08-28",
    },
    freshness,
    sessions: [{
      session_id: uuid(901),
      session_date: "2026-08-27",
      session_time_quality: "started_at",
      alignment_status: "evaluated",
      reason_code: null,
      historical_frontier: ["m", "a"],
      historical_roster_size: 6,
      historical_started_count: 4,
      history_quality: "causal_post_install",
      clock_quality_counts: { client: 2, server: 0, bootstrap: 0 },
      letters: [{ letter: "m", band: "aligned" }],
    }],
  };
}

const legacyEa = {
  ea_key: "id:101",
  ea_name: "Historical Example",
  ea_user_id: 101,
  school: "Legacy School",
  sessions_per_programme_day: 2.2,
  alignment_avg_score: 71,
  total_sessions: 42,
  groups_count: 3,
  letters_groups_count: 3,
  blending_groups_count: 0,
  children_count: 24,
  active_flags_count: 0,
  groups: [],
};
function legacyCurrent() {
  return {
    generated_at: "2026-08-28T12:00:00Z",
    snapshot_date: "2026-08-28",
    data_health: { stale: false, source_session_max: "2026-08-28" },
    summary: { total_eas: 1, avg_sessions_per_programme_day: 2.2, avg_alignment_score: 71, quadrant_counts: { top_right: 1, top_left: 0, bottom_right: 0, bottom_left: 0 } },
    eas: [legacyEa],
  };
}
function legacyHistory() {
  const dates = ["2026-07-31", "2026-08-14", "2026-08-28"];
  return {
    generated_at: "2026-08-28T12:00:00Z",
    snapshot_date: "2026-08-28",
    data_health: { stale: false, source_session_max: "2026-08-28" },
    sampling: { strategy: "weekly-plus-window-anchors-v1", source_date_count: 3, returned_date_count: 3 },
    dates,
    eas: [{ ea_key: legacyEa.ea_key, ea_user_id: 101, ea_name: legacyEa.ea_name, school: legacyEa.school, trajectory: dates.map((date, index) => ({ date, x: 1.8 + index * 0.2, y: 65 + index * 3 })) }],
  };
}

function send(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "private, no-store" });
  response.end(JSON.stringify(body));
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);
  if (url.pathname === "/health") return send(response, 200, { ok: true });
  if (url.pathname === "/__test/control" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const command = body ? JSON.parse(body) : {};
    if (command.reset) requestLog = [];
    if (typeof command.mode === "string") mode = command.mode;
    return send(response, 200, { ok: true, mode });
  }
  if (url.pathname === "/__test/requests") return send(response, 200, { mode, requests: requestLog });
  requestLog.push({ method: request.method, path: url.pathname, search: url.search });

  if (url.pathname === "/api/groups-2026/") {
    if (mode === "slice1") await sleep(1800);
    return send(response, 200, { groups: [] });
  }
  if (url.pathname === "/api/programme-overview/") return send(response, 200, { generated_at: "2026-08-28T12:00:00Z", programme: {}, targets: {}, kpis: { active_flags: 0 }, health: {}, data_health: {}, sessions_time_series: [], dosage_distribution: [] });
  if (url.pathname === "/api/schools-2026/") return send(response, 200, { generated_at: "2026-08-28T12:00:00Z", summary: {}, schools: [] });
  if (url.pathname === "/api/mobile/programme-fidelity/") {
    await sleep(500);
    if (mode === "mobile_fail") return send(response, 500, { error: "controlled mobile failure" });
    return send(response, 200, aggregate(url));
  }
  if (url.pathname === "/api/mobile/programme-fidelity/sessions/") return send(response, 200, sessions(url));
  if (url.pathname === "/api/ea-performance/") {
    if (mode === "success") await sleep(1800);
    if (mode === "historical_fail") return send(response, 500, { error: "controlled historical failure" });
    return send(response, 200, legacyCurrent());
  }
  if (url.pathname === "/api/ea-performance-history/") {
    if (mode === "historical_fail") return send(response, 500, { error: "controlled historical failure" });
    return send(response, 200, legacyHistory());
  }
  return send(response, 404, { error: "Teaching Overview mock route not found" });
}).listen(port, host);
