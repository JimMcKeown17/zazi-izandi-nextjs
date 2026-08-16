import assert from "node:assert/strict";
import test from "node:test";

import { runMobileHandoverContinuations } from "./continuation";
import { VALID_REASSIGN_JOB_PAYLOAD } from "./test-fixtures";

test("a zero-item created job always receives its first execute and reaches its terminal summary", async () => {
  const created = structuredClone(VALID_REASSIGN_JOB_PAYLOAD);
  created.job.total_items = 0;
  created.job.retryable = false;
  created.job.summary = "0 of 0 records moved.";
  created.items = [];

  const completed = structuredClone(created);
  completed.job.status = "complete";
  completed.job.summary = "0 of 0 records moved.";

  const calls: string[] = [];
  const updates: string[] = [];
  const result = await runMobileHandoverContinuations(
    created as never,
    async (jobId) => {
      calls.push(jobId);
      return { ok: true, data: completed as never };
    },
    (job) => updates.push(job.job.status)
  );

  assert.deepEqual(calls, [created.job.id]);
  assert.deepEqual(updates, ["complete"]);
  assert.equal(result.error, null);
  assert.equal(result.job.job.status, "complete");
});

test("retryable and progress guards apply only after the unconditional first pass", async () => {
  const created = structuredClone(VALID_REASSIGN_JOB_PAYLOAD);
  const noProgress = structuredClone(created);
  noProgress.job.retryable = true;

  let calls = 0;
  const result = await runMobileHandoverContinuations(
    created as never,
    async () => {
      calls += 1;
      return { ok: true, data: noProgress as never };
    },
    () => {}
  );

  assert.equal(calls, 1);
  assert.equal(result.job.job.status, "created");
});
