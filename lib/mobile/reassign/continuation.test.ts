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

test("an unbounded incrementing cursor with unchanged items cannot drive an endless execute loop", async () => {
  // The round-2 review attack: a stale/defective server answers every pass
  // with running + retryable:true, untouched pending items, and a cursor that
  // keeps climbing (with a server-controlled total_items large enough to keep
  // the cursor "in range"). Cursor motion alone must not count as progress.
  const initial = structuredClone(VALID_REASSIGN_JOB_PAYLOAD);
  initial.job.status = "running";

  let calls = 0;
  const result = await runMobileHandoverContinuations(
    initial as never,
    async () => {
      calls += 1;
      const next = structuredClone(initial);
      next.job.retryable = true;
      next.job.total_items = 1000;
      next.job.progress_cursor = calls - 1;
      return { ok: true, data: next as never };
    },
    () => {}
  );

  assert.equal(calls, 1);
  assert.equal(result.error?.code, "handover_stalled");
});

test("a cursor outside the job's item range stops the loop as inconsistent progress", async () => {
  const initial = structuredClone(VALID_REASSIGN_JOB_PAYLOAD);
  const drifted = structuredClone(initial);
  drifted.job.status = "running";
  drifted.job.retryable = true;
  drifted.job.progress_cursor = 5; // total_items is 1
  drifted.items[0].state = "transferred";

  let calls = 0;
  const result = await runMobileHandoverContinuations(
    initial as never,
    async () => {
      calls += 1;
      return { ok: true, data: drifted as never };
    },
    () => {}
  );

  assert.equal(calls, 1);
  assert.equal(result.error?.code, "handover_stalled");
});

test("a backward-moving cursor stops the loop even when items changed", async () => {
  const initial = structuredClone(VALID_REASSIGN_JOB_PAYLOAD);
  initial.job.status = "running";
  initial.job.progress_cursor = 0;
  initial.job.total_items = 2;
  initial.items.push({ ...structuredClone(initial.items[0]), position: 1 });
  initial.items[0].state = "transferred";

  const rewound = structuredClone(initial);
  rewound.job.retryable = true;
  rewound.job.progress_cursor = -1;
  rewound.items[1].state = "transferred";

  let calls = 0;
  const result = await runMobileHandoverContinuations(
    initial as never,
    async () => {
      calls += 1;
      return { ok: true, data: rewound as never };
    },
    () => {}
  );

  assert.equal(calls, 1);
  assert.equal(result.error?.code, "handover_stalled");
});

test("legitimate multi-pass progress continues to the terminal state", async () => {
  const initial = structuredClone(VALID_REASSIGN_JOB_PAYLOAD);
  initial.job.total_items = 2;
  initial.items.push({ ...structuredClone(initial.items[0]), position: 1 });

  const afterFirst = structuredClone(initial);
  afterFirst.job.status = "running";
  afterFirst.job.retryable = true;
  afterFirst.job.progress_cursor = 0;
  afterFirst.items[0].state = "transferred";

  const done = structuredClone(afterFirst);
  done.job.status = "complete";
  done.job.retryable = false;
  done.job.progress_cursor = 1;
  done.items[1].state = "transferred";

  const responses = [afterFirst, done];
  let calls = 0;
  const result = await runMobileHandoverContinuations(
    initial as never,
    async () => {
      calls += 1;
      return { ok: true, data: responses.shift() as never };
    },
    () => {}
  );

  assert.equal(calls, 2);
  assert.equal(result.error, null);
  assert.equal(result.job.job.status, "complete");
});
