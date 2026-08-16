import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMobileReassignCreateJobRequest,
  buildMobileReassignExecuteRequest,
  buildMobileReassignJobStatusRequest,
  buildMobileReassignRosterRequest,
} from "./request";
import { REASSIGN_UUIDS } from "./test-fixtures";

test("roster preview requests carry a canonical scoped query and Clerk bearer token", () => {
  const request = buildMobileReassignRosterRequest("session-token", {
    fromEa: REASSIGN_UUIDS.fromEa,
    scope: "class",
    scopeClassId: REASSIGN_UUIDS.class,
  });
  assert.equal(request.path, `/api/mobile/handover/roster/?from_ea=${REASSIGN_UUIDS.fromEa}&scope=class&scope_class_id=${REASSIGN_UUIDS.class}`);
  assert.equal(request.init.method, "GET");
  assert.equal(request.init.cache, "no-store");
  assert.equal(new Headers(request.init.headers).get("Authorization"), "Bearer session-token");
});

test("job creation sends only Django's snake-case body shape including decisions", () => {
  const request = buildMobileReassignCreateJobRequest("session-token", {
    fromEa: REASSIGN_UUIDS.fromEa,
    toEa: REASSIGN_UUIDS.toEa,
    scope: "roster",
    reason: "  EA resigned  ",
    unresolvedDecisions: [{ entityKind: "group", entityId: REASSIGN_UUIDS.group, decision: "leave" }],
  });
  assert.equal(request.path, "/api/mobile/handover/jobs/");
  assert.equal(request.init.method, "POST");
  assert.deepEqual(JSON.parse(String(request.init.body)), {
    from_ea: REASSIGN_UUIDS.fromEa,
    to_ea: REASSIGN_UUIDS.toEa,
    scope: "roster",
    scope_class_id: null,
    reason: "EA resigned",
    unresolved_decisions: [{ entity_kind: "group", entity_id: REASSIGN_UUIDS.group, decision: "leave" }],
  });
});

test("execute and status requests use Django's exact trailing-slash endpoint surface", () => {
  assert.equal(buildMobileReassignExecuteRequest("token", REASSIGN_UUIDS.job).path, `/api/mobile/handover/jobs/${REASSIGN_UUIDS.job}/execute/`);
  assert.equal(buildMobileReassignExecuteRequest("token", REASSIGN_UUIDS.job).init.method, "POST");
  assert.equal(buildMobileReassignJobStatusRequest("token", REASSIGN_UUIDS.job).path, `/api/mobile/handover/jobs/${REASSIGN_UUIDS.job}/`);
  assert.equal(buildMobileReassignJobStatusRequest("token", REASSIGN_UUIDS.job).init.method, "GET");
});

test("builders reject blank tokens, non-UUID identifiers, invalid scope combinations, bad decisions, and invalid reasons", () => {
  assert.throws(() => buildMobileReassignRosterRequest("", { fromEa: REASSIGN_UUIDS.fromEa }), /session token/);
  assert.throws(() => buildMobileReassignRosterRequest("token", { fromEa: "not-a-uuid" }), /canonical UUID/);
  assert.throws(() => buildMobileReassignRosterRequest("token", { fromEa: REASSIGN_UUIDS.fromEa, scope: "class" }), /requires scopeClassId/);
  assert.throws(() => buildMobileReassignCreateJobRequest("token", { fromEa: REASSIGN_UUIDS.fromEa, toEa: REASSIGN_UUIDS.toEa, scope: "roster", scopeClassId: REASSIGN_UUIDS.class, reason: "r" }), /does not allow/);
  assert.throws(() => buildMobileReassignCreateJobRequest("token", { fromEa: REASSIGN_UUIDS.fromEa, toEa: REASSIGN_UUIDS.toEa, scope: "roster", reason: "x".repeat(201) }), /at most 200/);
  assert.throws(() => buildMobileReassignCreateJobRequest("token", { fromEa: REASSIGN_UUIDS.fromEa, toEa: REASSIGN_UUIDS.toEa, scope: "roster", reason: "r", unresolvedDecisions: [{ entityKind: "group", entityId: REASSIGN_UUIDS.group, decision: "other" as never }] }), /move or leave/);
});
