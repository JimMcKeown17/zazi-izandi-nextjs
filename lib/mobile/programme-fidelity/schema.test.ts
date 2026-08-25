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

test("the decoder schema is recursively closed", () => {
  const poisoned = structuredClone(VALID_PROGRAMME_FIDELITY_PAYLOAD);
  (poisoned.rows[0] as unknown as Record<string, unknown>).learner_id = "secret";
  (poisoned.rows[0].reason as unknown as Record<string, unknown>).raw_payload = "secret";
  assert.equal(programmeFidelitySchema.safeParse(poisoned).success, false);

  const poisonedSession = structuredClone(VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD);
  (poisonedSession.sessions[0].letters[0] as unknown as Record<string, unknown>).answer = "secret";
  assert.equal(programmeFidelitySessionsSchema.safeParse(poisonedSession).success, false);
});

test("v0-a cannot smuggle a score or historical frontier into unavailable states", () => {
  const scored = structuredClone(VALID_PROGRAMME_FIDELITY_PAYLOAD);
  scored.rows[0].score = 0;
  assert.equal(programmeFidelitySchema.safeParse(scored).success, false);

  const frontier = structuredClone(VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD);
  frontier.sessions[0].historical_frontier = ["m"];
  assert.equal(programmeFidelitySessionsSchema.safeParse(frontier).success, false);
});

test("former owners cannot inherit current roster or next-letter guidance", () => {
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
