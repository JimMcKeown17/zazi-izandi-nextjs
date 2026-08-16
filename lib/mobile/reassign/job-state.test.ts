import assert from "node:assert/strict";
import test from "node:test";

import {
  getMobileReassignJobId,
  getMobileReassignJobUrl,
  isMobileHandoverTerminal,
} from "./job-state";
import { VALID_REASSIGN_JOB_PAYLOAD } from "./test-fixtures";

const JOB_ID = VALID_REASSIGN_JOB_PAYLOAD.job.id;

test("the durable job query parser accepts only canonical UUIDs", () => {
  assert.equal(getMobileReassignJobId(`?job=${JOB_ID}`), JOB_ID);
  assert.equal(getMobileReassignJobId(`?job=${JOB_ID.toUpperCase()}`), JOB_ID);
  assert.equal(getMobileReassignJobId("?job=not-a-uuid"), null);
  assert.equal(getMobileReassignJobId("?other=value"), null);
});

test("the durable job URL preserves unrelated query state and rejects malformed ids", () => {
  assert.equal(
    getMobileReassignJobUrl("/mobile-app/reassign", "?from=users", JOB_ID),
    `/mobile-app/reassign?from=users&job=${JOB_ID}`
  );
  assert.throws(
    () => getMobileReassignJobUrl("/mobile-app/reassign", "", "not-a-uuid"),
    /canonical UUID/
  );
});

test("terminal detection retains needs_repreview and integrity_fault as terminal", () => {
  for (const status of [
    "complete",
    "complete_with_refusals",
    "complete_with_exclusions",
    "needs_repreview",
    "integrity_fault",
  ]) {
    const job = structuredClone(VALID_REASSIGN_JOB_PAYLOAD);
    job.job.status = status;
    assert.equal(isMobileHandoverTerminal(job as never), true, status);
  }
  assert.equal(isMobileHandoverTerminal(VALID_REASSIGN_JOB_PAYLOAD as never), false);
});
