import assert from "node:assert/strict";
import test from "node:test";

import {
  programmeFidelitySchema,
  programmeFidelitySessionsSchema,
} from "./schema";
import {
  VALID_PROGRAMME_FIDELITY_PAYLOAD,
  VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD,
} from "./test-fixtures";

test("the complete v0-a envelope is accepted with unavailable causal fields null", () => {
  assert.equal(programmeFidelitySchema.safeParse(VALID_PROGRAMME_FIDELITY_PAYLOAD).success, true);
  assert.equal(
    programmeFidelitySessionsSchema.safeParse(VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD).success,
    true
  );
});

test("self-describing assessment provenance annotations are accepted as closed codes", () => {
  const payload = structuredClone(VALID_PROGRAMME_FIDELITY_PAYLOAD);
  payload.rows[0].supporting_reasons = [
    {
      code: "unregistered_assessment_form",
      observation: "Stored items were scored from an unregistered form.",
    },
    {
      code: "assessment_form_language_mismatch",
      observation: "Stored items were scored despite mismatched form metadata.",
    },
  ];

  assert.equal(programmeFidelitySchema.safeParse(payload).success, true);
});

test("the decoder schema is recursively closed", () => {
  const poisoned = structuredClone(VALID_PROGRAMME_FIDELITY_PAYLOAD);
  (poisoned.rows[0] as unknown as Record<string, unknown>).learner_id = "secret";
  (poisoned.rows[0].reason as unknown as Record<string, unknown>).raw_payload = "secret";
  assert.equal(programmeFidelitySchema.safeParse(poisoned).success, false);

  const poisonedSession = structuredClone(VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD);
  (poisonedSession.sessions[0].letters[0] as unknown as Record<string, unknown>).answer = "secret";
  assert.equal(programmeFidelitySessionsSchema.safeParse(poisonedSession).success, false);
});

test("unknown calculation versions fail closed", () => {
  const aggregate = structuredClone(VALID_PROGRAMME_FIDELITY_PAYLOAD);
  aggregate.calculation_version = "arbitrary_future_or_corrupt_semantics";
  assert.equal(programmeFidelitySchema.safeParse(aggregate).success, false);

  const sessions = structuredClone(VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD);
  sessions.calculation_version = "arbitrary_future_or_corrupt_semantics";
  assert.equal(programmeFidelitySessionsSchema.safeParse(sessions).success, false);
});

test("v0-a cannot smuggle a score or historical frontier into unavailable states", () => {
  const scored = structuredClone(VALID_PROGRAMME_FIDELITY_PAYLOAD);
  scored.rows[0].score = 0;
  assert.equal(programmeFidelitySchema.safeParse(scored).success, false);

  const frontier = structuredClone(VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD);
  frontier.sessions[0].historical_frontier = ["m"];
  assert.equal(programmeFidelitySessionsSchema.safeParse(frontier).success, false);
});

test("historical activity rows cannot inherit current roster or next-letter guidance", () => {
  const payload = structuredClone(VALID_PROGRAMME_FIDELITY_PAYLOAD);
  payload.rows[1].introduce_letters = ["m"];
  assert.equal(programmeFidelitySchema.safeParse(payload).success, false);
});

test("summary tiles and current guidance must reconcile with the decoded rows", () => {
  const badTile = structuredClone(VALID_PROGRAMME_FIDELITY_PAYLOAD);
  badTile.aggregates.groups_needing_attention = 99;
  assert.equal(programmeFidelitySchema.safeParse(badTile).success, false);

  const oneSidedGuidance = structuredClone(VALID_PROGRAMME_FIDELITY_PAYLOAD);
  oneSidedGuidance.rows[0].introduce_letters = null;
  assert.equal(programmeFidelitySchema.safeParse(oneSidedGuidance).success, false);
});

test("session explanations must preserve both 14-date windows and their 15-date union", () => {
  const drift = structuredClone(VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD);
  drift.applied_filters.alignment_date_to = "2026-08-25";
  assert.equal(programmeFidelitySessionsSchema.safeParse(drift).success, false);

  const outside = structuredClone(VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD);
  outside.sessions[0].session_date = "2026-08-10";
  assert.equal(programmeFidelitySessionsSchema.safeParse(outside).success, false);
});

test("v0-b accepts causal values and keeps a fully scorable evaluated reason null", () => {
  const aggregate = structuredClone(VALID_PROGRAMME_FIDELITY_PAYLOAD);
  aggregate.calculation_version = "mobile_fidelity_causal_alignment_v1";
  aggregate.alignment_scored_through_date = "2026-08-24";
  aggregate.alignment_availability = {
    status: "partial",
    ledger_installed_at: "2026-08-15T10:00:00+00:00",
    last_complete_event_run_finished_at: "2026-08-25T15:05:00+00:00",
    scored_through_date: "2026-08-24",
    message: "Historical alignment is available for a partial window.",
  };
  aggregate.history_quality = {
    status: "causal_history_available",
    causal_session_count: 1,
    bootstrap_influenced_count: 0,
  };
  for (const [index, row] of aggregate.rows.entries()) {
    Object.assign(row, {
      alignment_status: index === 0 ? "partial" : "no_eligible_sessions",
      alignment_scored_through_date: "2026-08-24",
      aligned_count: index === 0 ? 1 : 0,
      below_count: 0,
      above_count: index === 0 ? 1 : 0,
      unscored_count: 0,
      scored_n: index === 0 ? 2 : 0,
      score: index === 0 ? 50 : null,
      causal_post_install_count: index === 0 ? 1 : 0,
      bootstrap_influenced_count: 0,
      client_clock_count: index === 0 ? 6 : 0,
      server_clock_count: 0,
      bootstrap_clock_count: 0,
    });
  }
  assert.equal(programmeFidelitySchema.safeParse(aggregate).success, true);

  const bootstrapCaution = structuredClone(aggregate);
  bootstrapCaution.rows[0].primary_reason = "BOOTSTRAP_HISTORY_LIMITED";
  bootstrapCaution.rows[0].reason.code = "BOOTSTRAP_HISTORY_LIMITED";
  bootstrapCaution.aggregates.groups_needing_attention = 0;
  assert.equal(programmeFidelitySchema.safeParse(bootstrapCaution).success, true);

  const impossibleNoSessions = structuredClone(aggregate);
  Object.assign(impossibleNoSessions.rows[1], {
    aligned_count: 1,
    scored_n: 1,
    score: 100,
  });
  assert.equal(programmeFidelitySchema.safeParse(impossibleNoSessions).success, false);

  const inconsistentScore = structuredClone(aggregate);
  inconsistentScore.rows[0].score = 51;
  assert.equal(programmeFidelitySchema.safeParse(inconsistentScore).success, false);

  const currentVersionWithCausalClaims = structuredClone(aggregate);
  currentVersionWithCausalClaims.calculation_version = "mobile_fidelity_current_state_v1_1";
  assert.equal(programmeFidelitySchema.safeParse(currentVersionWithCausalClaims).success, false);

  const sessions = structuredClone(VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD);
  sessions.calculation_version = "mobile_fidelity_causal_alignment_v1";
  sessions.sessions[0] = {
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
  };
  assert.equal(programmeFidelitySessionsSchema.safeParse(sessions).success, true);

  const missingFrontier = structuredClone(sessions);
  missingFrontier.sessions[0].historical_frontier = null;
  assert.equal(programmeFidelitySessionsSchema.safeParse(missingFrontier).success, false);

  const impossibleCoverage = structuredClone(sessions);
  impossibleCoverage.sessions[0].historical_started_count = 6;
  assert.equal(programmeFidelitySessionsSchema.safeParse(impossibleCoverage).success, false);

  sessions.sessions[0].letters = [{ letter: "m", band: "unscored" }];
  assert.equal(programmeFidelitySessionsSchema.safeParse(sessions).success, false);
  sessions.sessions[0].reason_code = "LOW_TRACKER_COVERAGE";
  sessions.sessions[0].historical_frontier = null;
  assert.equal(programmeFidelitySessionsSchema.safeParse(sessions).success, true);

  const masterySemantics = structuredClone(sessions);
  masterySemantics.sessions[0].reason_code = "MASTERY_SEMANTICS_UNVERIFIED" as never;
  assert.equal(programmeFidelitySessionsSchema.safeParse(masterySemantics).success, true);
  masterySemantics.sessions[0].historical_frontier = ["m"];
  assert.equal(programmeFidelitySessionsSchema.safeParse(masterySemantics).success, false);

  const invalidLetters = structuredClone(sessions);
  invalidLetters.sessions[0] = {
    ...invalidLetters.sessions[0],
    reason_code: "INVALID_SESSION_LETTERS",
    historical_frontier: null,
    historical_roster_size: null,
    historical_started_count: null,
    history_quality: null,
    clock_quality_counts: null,
    letters: [],
  };
  assert.equal(programmeFidelitySessionsSchema.safeParse(invalidLetters).success, true);

  const unknownLanguage = structuredClone(invalidLetters);
  unknownLanguage.sessions[0].reason_code = "UNKNOWN_LANGUAGE";
  unknownLanguage.sessions[0].letters = [{ letter: "m", band: "unscored" }];
  assert.equal(programmeFidelitySessionsSchema.safeParse(unknownLanguage).success, true);

  const falseHistoricalCoverage = structuredClone(unknownLanguage);
  falseHistoricalCoverage.sessions[0].historical_roster_size = 5;
  falseHistoricalCoverage.sessions[0].historical_started_count = 0;
  assert.equal(programmeFidelitySessionsSchema.safeParse(falseHistoricalCoverage).success, false);

  const currentVersionWithEvaluation = structuredClone(sessions);
  currentVersionWithEvaluation.calculation_version = "mobile_fidelity_current_state_v1_1";
  assert.equal(programmeFidelitySessionsSchema.safeParse(currentVersionWithEvaluation).success, false);
});
