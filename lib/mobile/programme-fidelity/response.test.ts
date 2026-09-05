import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeProgrammeFidelityResponse,
  decodeProgrammeFidelitySessionsResponse,
} from "./response";
import {
  EA_ID,
  GROUP_ID,
  VALID_CAUSAL_V2_PROGRAMME_FIDELITY_PAYLOAD,
  VALID_CAUSAL_V2_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD,
  VALID_PROGRAMME_FIDELITY_PAYLOAD,
  VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD,
} from "./test-fixtures";

const filters = { schoolId: null, eaUserId: null, attention: "all" as const };

test("aggregate and session decoders retain exact correlated envelopes", async () => {
  assert.deepEqual(
    await decodeProgrammeFidelityResponse(
      new Response(JSON.stringify(VALID_PROGRAMME_FIDELITY_PAYLOAD), { status: 200 }),
      filters
    ),
    { ok: true, data: VALID_PROGRAMME_FIDELITY_PAYLOAD }
  );
  assert.deepEqual(
    await decodeProgrammeFidelitySessionsResponse(
      new Response(JSON.stringify(VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD), { status: 200 }),
      { groupId: GROUP_ID, eaUserId: EA_ID }
    ),
    { ok: true, data: VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD }
  );
});

test("aggregate and session decoders retain the exact causal v2 envelopes", async () => {
  assert.deepEqual(
    await decodeProgrammeFidelityResponse(
      new Response(JSON.stringify(VALID_CAUSAL_V2_PROGRAMME_FIDELITY_PAYLOAD), { status: 200 }),
      filters
    ),
    { ok: true, data: VALID_CAUSAL_V2_PROGRAMME_FIDELITY_PAYLOAD }
  );
  assert.deepEqual(
    await decodeProgrammeFidelitySessionsResponse(
      new Response(JSON.stringify(VALID_CAUSAL_V2_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD), { status: 200 }),
      { groupId: GROUP_ID, eaUserId: EA_ID }
    ),
    { ok: true, data: VALID_CAUSAL_V2_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD }
  );
});

test("request/response filter and expansion mismatches fail closed", async () => {
  const aggregate = await decodeProgrammeFidelityResponse(
    new Response(JSON.stringify(VALID_PROGRAMME_FIDELITY_PAYLOAD), { status: 200 }),
    { ...filters, attention: "current" }
  );
  const sessions = await decodeProgrammeFidelitySessionsResponse(
    new Response(JSON.stringify(VALID_PROGRAMME_FIDELITY_SESSIONS_PAYLOAD), { status: 200 }),
    { groupId: GROUP_ID, eaUserId: "00000000-0000-4000-8000-000000000099" }
  );
  assert.deepEqual(aggregate, {
    ok: false,
    status: 502,
    kind: "unavailable",
    message: "Programme fidelity is temporarily unavailable.",
  });
  assert.equal(sessions.ok, false);
  if (!sessions.ok) assert.equal(sessions.status, 502);
});

test("authentication, authorization, first-compute, and upstream failures remain distinct", async () => {
  const cases = [
    [401, "not_authenticated"],
    [403, "not_authorized"],
    [503, "not_computed"],
    [500, "unavailable"],
  ] as const;
  for (const [status, kind] of cases) {
    const result = await decodeProgrammeFidelityResponse(new Response("{}", { status }), filters);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.kind, kind);
  }
});

test("invalid JSON, missing fields, unknown fields, and window drift fail closed", async () => {
  const missing = structuredClone(VALID_PROGRAMME_FIDELITY_PAYLOAD) as unknown as Record<string, unknown>;
  delete missing.aggregates;
  const extra = { ...VALID_PROGRAMME_FIDELITY_PAYLOAD, cursor: "secret" };
  const drift = { ...VALID_PROGRAMME_FIDELITY_PAYLOAD, window_days: 13 };
  for (const body of ["not-json", JSON.stringify(missing), JSON.stringify(extra), JSON.stringify(drift)]) {
    const result = await decodeProgrammeFidelityResponse(new Response(body, { status: 200 }), filters);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 502);
  }
});
