import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MobileSidebarNavigation } from "@/components/mobile-app/layout/mobile-sidebar";
import {
  correlateProgrammeFidelitySessions,
  FidelityPageContent,
} from "@/components/mobile-app/programme-fidelity/fidelity-page-content";
import { FidelityReason } from "@/components/mobile-app/programme-fidelity/fidelity-reason";
import { FidelitySessionDetails } from "@/components/mobile-app/programme-fidelity/fidelity-session-details";
import {
  VALID_PROGRAMME_FIDELITY_PAYLOAD,
  VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD,
} from "./test-fixtures";

test("the server route guards capability and parallelizes independent aggregate/detail reads", () => {
  const page = fs.readFileSync(
    path.join(process.cwd(), "app/mobile-app/programme-fidelity/page.tsx"),
    "utf8"
  );
  assert.match(page, /requireMobileSessionsSession/);
  assert.match(page, /Promise\.all/);
  assert.match(page, /fetchProgrammeFidelityWithToken/);
  assert.match(page, /fetchProgrammeFidelitySessionsWithToken/);
  assert.doesNotMatch(page, /supabase|service_role/i);
});

test("the populated v0-a page renders coaching guidance without causal or ranking claims", () => {
  const html = renderToStaticMarkup(
    createElement(FidelityPageContent, {
      result: { ok: true, data: VALID_PROGRAMME_FIDELITY_PAYLOAD },
      sessionsResult: null,
      filters: { schoolId: null, eaUserId: null, attention: "all" },
      expansion: null,
    })
  );
  assert.match(html, /Current mobile guidance is live/);
  assert.match(html, /historical alignment is not yet calculated/i);
  assert.match(html, /Suggested next letters: m, a/);
  assert.match(html, /Historical activity.*current letter guidance is unavailable/i);
  assert.doesNotMatch(html, /former owner/i);
  assert.match(html, /This is not an EA ranking/);
  assert.match(html, /href="\/pm"/);
  assert.doesNotMatch(html, /on track/i);
  assert.doesNotMatch(html, /learner_id|child_uuid|service_role|source cursor/i);
});

test("Programme fidelity is session-capability visible in desktop and mobile navigation", () => {
  const permitted = renderToStaticMarkup(
    createElement(MobileSidebarNavigation, {
      pathname: "/mobile-app/programme-fidelity",
      canReadSessions: true,
      canReadTimeEntries: false,
      canReadUserHealth: false,
    })
  );
  const denied = renderToStaticMarkup(
    createElement(MobileSidebarNavigation, {
      pathname: "/mobile-app/user-health",
      canReadSessions: false,
      canReadTimeEntries: false,
      canReadUserHealth: true,
    })
  );
  assert.match(permitted, /href="\/mobile-app\/programme-fidelity"/);
  assert.match(permitted, /aria-label="Programme fidelity"/);
  assert.doesNotMatch(denied, /href="\/mobile-app\/programme-fidelity"|aria-label="Programme fidelity"/);
});

test("a stale completed snapshot is retained but visibly labelled stale", () => {
  const stale = structuredClone(VALID_PROGRAMME_FIDELITY_PAYLOAD);
  stale.freshness.is_stale = true;
  const html = renderToStaticMarkup(
    createElement(FidelityPageContent, {
      result: { ok: true, data: stale },
      sessionsResult: null,
      filters: { schoolId: null, eaUserId: null, attention: "all" },
      expansion: null,
    })
  );
  assert.match(html, /Latest completed mobile guidance is stale/);
  assert.match(html, /stale — latest completed data retained/);
});

test("v0-b session detail explains causal bands, evidence provenance, and unscorable reasons", () => {
  const sessions = structuredClone(VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD);
  sessions.calculation_version = "mobile_fidelity_causal_alignment_v1";
  sessions.sessions = [
    {
      ...sessions.sessions[0],
      session_date: "2026-08-23",
      alignment_status: "evaluated",
      reason_code: null,
      historical_frontier: ["m", "a"],
      historical_roster_size: 5,
      historical_started_count: 4,
      history_quality: "causal_post_install",
      clock_quality_counts: { client: 6, server: 0, bootstrap: 0 },
      letters: [
        { letter: "m", band: "aligned" },
        { letter: "s", band: "above" },
      ],
    },
    {
      ...sessions.sessions[0],
      session_id: "00000000-0000-4000-8000-000000000052",
      session_date: "2026-08-22",
      alignment_status: "evaluated",
      reason_code: "LOW_TRACKER_COVERAGE",
      historical_frontier: null,
      historical_roster_size: 5,
      historical_started_count: 2,
      history_quality: "bootstrap_influenced",
      clock_quality_counts: { client: 1, server: 0, bootstrap: 4 },
      letters: [{ letter: "m", band: "unscored" }],
    },
    {
      ...sessions.sessions[0],
      session_id: "00000000-0000-4000-8000-000000000053",
      session_date: "2026-08-21",
      alignment_status: "evaluated",
      reason_code: "MASTERY_SEMANTICS_UNVERIFIED" as never,
      historical_frontier: null,
      historical_roster_size: 5,
      historical_started_count: 4,
      history_quality: "causal_post_install",
      clock_quality_counts: { client: 4, server: 0, bootstrap: 0 },
      letters: [{ letter: "s", band: "unscored" }],
    },
  ];
  const html = renderToStaticMarkup(
    createElement(FidelitySessionDetails, {
      result: { ok: true, data: sessions },
    })
  );
  assert.match(html, /Historical frontier.*m, a/i);
  assert.match(html, /4 of 5.*letter evidence/i);
  assert.match(html, /client.*6/i);
  assert.match(html, /Low tracker coverage/i);
  assert.match(html, /install baseline.*timing/i);
  assert.match(html, /Mastery meaning unverified/i);
  assert.match(html, /older tracker instructions used ambiguous wording/i);
  assert.match(
    html,
    /Assessment evidence at session.*4 of 5.*assessment-supported letter evidence/i
  );
  assert.doesNotMatch(html, /on track|good EA|bad EA/i);
});

test("history-unavailable evaluated reasons render without invented evidence counts", () => {
  const sessions = structuredClone(VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD);
  sessions.calculation_version = "mobile_fidelity_causal_alignment_v1";
  sessions.sessions = [
    {
      ...sessions.sessions[0],
      alignment_status: "evaluated",
      reason_code: "UNKNOWN_LANGUAGE",
      historical_frontier: null,
      historical_roster_size: null,
      historical_started_count: null,
      history_quality: null,
      clock_quality_counts: null,
      letters: [{ letter: "s", band: "unscored" }],
    },
    {
      ...sessions.sessions[0],
      session_id: "00000000-0000-4000-8000-000000000052",
      alignment_status: "evaluated",
      reason_code: "INVALID_SESSION_LETTERS",
      historical_frontier: null,
      historical_roster_size: null,
      historical_started_count: null,
      history_quality: null,
      clock_quality_counts: null,
      letters: [],
    },
  ];

  const html = renderToStaticMarkup(
    createElement(FidelitySessionDetails, {
      result: { ok: true, data: sessions },
    })
  );

  assert.match(html, /s · unscored/);
  assert.match(html, /group&#x27;s language does not map/i);
  assert.match(html, /No valid focused-letter detail was published/);
  assert.doesNotMatch(html, /Evidence at session|Evidence clocks|History quality/);
});

test("parallel aggregate and session responses must come from one calculation", () => {
  const sessions = structuredClone(VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD);
  sessions.freshness.compute_completed_at = "2026-08-25T12:06:00+00:00";

  const correlated = correlateProgrammeFidelitySessions(
    { ok: true, data: VALID_PROGRAMME_FIDELITY_PAYLOAD },
    { ok: true, data: sessions }
  );

  assert.deepEqual(correlated, {
    ok: false,
    status: 503,
    kind: "unavailable",
    message: "Session detail crossed a nightly publication boundary. Reload to use one completed calculation.",
  });
});

test("v0-b aggregate view shows the partial boundary, raw bands, and coaching language", () => {
  const data = structuredClone(VALID_PROGRAMME_FIDELITY_PAYLOAD);
  data.calculation_version = "mobile_fidelity_causal_alignment_v1";
  data.alignment_scored_through_date = "2026-08-24";
  data.alignment_availability = {
    status: "partial",
    ledger_installed_at: "2026-08-15T10:00:00+00:00",
    last_complete_event_run_finished_at: "2026-08-25T15:05:00+00:00",
    scored_through_date: "2026-08-24",
    message: "Historical session alignment is available for a partial window through 2026-08-24.",
  };
  data.history_quality = {
    status: "causal_history_available",
    causal_session_count: 1,
    bootstrap_influenced_count: 0,
  };
  data.rows[0] = {
    ...data.rows[0],
    primary_reason: "TEACHING_AHEAD_OF_FRONTIER",
    reason: {
      code: "TEACHING_AHEAD_OF_FRONTIER",
      title: "Teaching may be ahead of the historical frontier",
      observation: "One recently focused letter was later than the reconstructed frontier.",
      recommended_check: "Review the session and current app guidance with the EA.",
    },
    alignment_status: "partial",
    alignment_scored_through_date: "2026-08-24",
    aligned_count: 1,
    below_count: 0,
    above_count: 1,
    unscored_count: 0,
    scored_n: 2,
    score: 50,
    causal_post_install_count: 1,
    bootstrap_influenced_count: 0,
    client_clock_count: 6,
    server_clock_count: 0,
    bootstrap_clock_count: 0,
  };
  data.rows[1] = {
    ...data.rows[1],
    alignment_status: "no_eligible_sessions",
    alignment_scored_through_date: "2026-08-24",
    aligned_count: 0,
    below_count: 0,
    above_count: 0,
    unscored_count: 0,
    scored_n: 0,
    score: null,
    causal_post_install_count: 0,
    bootstrap_influenced_count: 0,
    client_clock_count: 0,
    server_clock_count: 0,
    bootstrap_clock_count: 0,
  };
  const html = renderToStaticMarkup(
    createElement(FidelityPageContent, {
      result: { ok: true, data },
      sessionsResult: null,
      filters: { schoolId: null, eaUserId: null, attention: "all" },
      expansion: null,
    })
  );
  assert.match(html, /partial window through 2026-08-24/i);
  assert.match(html, /historical tracker instructions were ambiguous/i);
  assert.match(html, /could change the reconstructed coaching decision or letter classification/i);
  assert.match(html, /unscored sessions are excluded/i);
  assert.doesNotMatch(html, /could change the reconstructed frontier/i);
  assert.match(html, /Partial causal window/i);
  assert.match(html, /50\.0%/);
  assert.match(html, /1 aligned.*1 above/i);
  assert.match(html, /Teaching may be ahead of the historical frontier/i);
  assert.match(html, /Not enough causal evidence/i);
  assert.doesNotMatch(html, /on track|EA ranking score|good EA|bad EA/i);
});

test("bootstrap-only history is an interpretation note, not a corrective mentor flag", () => {
  const data = structuredClone(VALID_PROGRAMME_FIDELITY_PAYLOAD);
  data.rows[0].primary_reason = "BOOTSTRAP_HISTORY_LIMITED";
  data.rows[0].reason = {
    code: "BOOTSTRAP_HISTORY_LIMITED",
    title: "Historical timing is partly limited",
    observation: "This row includes install-baseline evidence.",
    recommended_check: "Interpret the historical timing cautiously.",
  };
  data.aggregates.groups_needing_attention = 0;

  const html = renderToStaticMarkup(createElement(FidelityReason, { row: data.rows[0] }));

  assert.match(html, /Interpretation note/);
  assert.doesNotMatch(html, /Next mentor check/);
});

test("unverified historical mastery meaning stays visible within the evidence-check row", () => {
  const data = structuredClone(VALID_PROGRAMME_FIDELITY_PAYLOAD);
  data.rows[0].primary_reason = "RECENT_ACTIVITY_UNSCORABLE";
  data.rows[0].reason = {
    code: "RECENT_ACTIVITY_UNSCORABLE",
    title: "Recent activity needs an evidence check",
    observation: "At least one recent session could not be classified.",
    recommended_check: "Open the session explanation to distinguish a correctable source issue from historical evidence that must remain unscored.",
  };
  data.rows[0].supporting_reasons = [{
    code: "mastery_semantics_unverified",
    observation: "Older tracker instructions were ambiguous, so this historical session was not scored. Its old manual marks cannot be corrected or reinterpreted, and this is not a conclusion that the EA taught incorrectly.",
  }];

  const html = renderToStaticMarkup(createElement(FidelityReason, { row: data.rows[0] }));

  assert.match(html, /Next mentor check/);
  assert.match(html, /Recent activity needs an evidence check/);
  assert.match(html, /Older tracker instructions were ambiguous/);
  assert.match(html, /cannot be corrected or reinterpreted/i);
  assert.match(html, /not a conclusion that the EA taught incorrectly/i);
});
