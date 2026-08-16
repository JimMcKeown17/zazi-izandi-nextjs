import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeMobileReassignJobResponse,
  decodeMobileReassignRosterResponse,
} from "./response";
import {
  VALID_REASSIGN_JOB_PAYLOAD,
  VALID_REASSIGN_ROSTER_PAYLOAD,
} from "./test-fixtures";

test("the roster and job envelopes decode without loss", async () => {
  assert.deepEqual(await decodeMobileReassignRosterResponse(new Response(JSON.stringify(VALID_REASSIGN_ROSTER_PAYLOAD))), { ok: true, data: VALID_REASSIGN_ROSTER_PAYLOAD });
  assert.deepEqual(await decodeMobileReassignJobResponse(new Response(JSON.stringify(VALID_REASSIGN_JOB_PAYLOAD))), { ok: true, data: VALID_REASSIGN_JOB_PAYLOAD });
});

test("all persisted job statuses and item states are recognized, including needs_repreview and integrity_fault", async () => {
  for (const status of ["created", "running", "complete", "complete_with_refusals", "complete_with_exclusions", "needs_repreview", "integrity_fault"] as const) {
    const payload = structuredClone(VALID_REASSIGN_JOB_PAYLOAD);
    payload.job.status = status;
    payload.job.retryable = status === "created" || status === "running";
    payload.job.in_flight = false;
    const result = await decodeMobileReassignJobResponse(new Response(JSON.stringify(payload)));
    assert.equal(result.ok, true, status);
  }
  for (const state of ["pending", "transferred", "refused", "stale", "error", "excluded"] as const) {
    const payload = structuredClone(VALID_REASSIGN_JOB_PAYLOAD);
    payload.items[0].state = state;
    const result = await decodeMobileReassignJobResponse(new Response(JSON.stringify(payload)));
    assert.equal(result.ok, true, state);
  }
});

test("every documented per-item refusal code decodes and unknown values fail closed", async () => {
  const codes = ["target_name_collision", "shared_class_unsupported", "entity_archived", "no_current_holder", "claimant_ambiguous", "cas_conflict", "no_active_assignment", "group_class_holder_mismatch", "entity_not_found", "target_ea_not_found", "seed_lease_busy", "request_id_reuse_mismatch", "from_equals_to", "timeout", "upstream_unavailable", "parent_stale_veto", "operator_left_behind", "malformed_wrapper_result"];
  for (const code of codes) {
    const payload = structuredClone(VALID_REASSIGN_JOB_PAYLOAD);
    payload.items[0].refusal_code = code;
    assert.equal((await decodeMobileReassignJobResponse(new Response(JSON.stringify(payload)))).ok, true, code);
  }
  const malformed = structuredClone(VALID_REASSIGN_JOB_PAYLOAD);
  malformed.items[0].refusal_code = "future_wrapper_code";
  assert.deepEqual(await decodeMobileReassignJobResponse(new Response(JSON.stringify(malformed))), { ok: false, status: 502, code: "malformed_response", message: "The roster handover service returned an unexpected format." });
});

test("error decoding pins documented endpoint code/status pairs and rejects unknown or malformed errors", async () => {
  const cases = [
    [422, "scope_class_not_owned"], [409, "handover_lease_busy"], [409, "handover_job_already_active"],
    [502, "mobile_handover_unavailable"], [502, "mobile_handover_roster_too_large"], [504, "mobile_handover_timeout"],
  ] as const;
  for (const [status, code] of cases) {
    assert.deepEqual(await decodeMobileReassignRosterResponse(new Response(JSON.stringify({ error: "fixture", code }), { status })), { ok: false, status, code, message: "fixture" });
  }
  assert.deepEqual(await decodeMobileReassignJobResponse(new Response(JSON.stringify({ error: "handover job not found" }), { status: 404 })), { ok: false, status: 404, code: "handover_job_not_found", message: "handover job not found" });
  for (const response of [
    new Response(JSON.stringify({ error: "fixture", code: "future_code" }), { status: 502 }),
    new Response(JSON.stringify({ error: "fixture", code: "scope_class_not_owned" }), { status: 502 }),
    new Response("<html>", { status: 502 }),
    new Response(JSON.stringify({ error: "fixture" }), { status: 418 }),
  ]) {
    const result = await decodeMobileReassignRosterResponse(response);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "malformed_response");
  }
});

test("unknown job statuses, count drift, illegal scope pairing, and malformed success payloads fail closed", async () => {
  const badStatus = structuredClone(VALID_REASSIGN_JOB_PAYLOAD);
  badStatus.job.status = "future_status";
  assert.equal((await decodeMobileReassignJobResponse(new Response(JSON.stringify(badStatus)))).ok, false);
  const countDrift = structuredClone(VALID_REASSIGN_ROSTER_PAYLOAD);
  countDrift.counts.classes = 4;
  assert.equal((await decodeMobileReassignRosterResponse(new Response(JSON.stringify(countDrift)))).ok, false);
  const scopeDrift = structuredClone(VALID_REASSIGN_ROSTER_PAYLOAD);
  scopeDrift.scope = "class";
  assert.equal((await decodeMobileReassignRosterResponse(new Response(JSON.stringify(scopeDrift)))).ok, false);
  assert.equal((await decodeMobileReassignJobResponse(new Response("<html>"))).ok, false);
});
