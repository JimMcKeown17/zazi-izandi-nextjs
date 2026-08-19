import assert from "node:assert/strict";
import test from "node:test";

import { mobileSessionReviewFlagsSchema, mobileSessionsActivitySchema } from "./schema";

test("sessions responses reject a generated_at value that is not an absolute ISO-8601 timestamp", () => {
  const parsed = mobileSessionsActivitySchema.safeParse({
    generated_at: "not-an-absolute-timestamp",
    days: 1,
    applied_filters: { school_id: null },
    school_options: [],
    daily_trend: [
      {
        date: "2026-08-10",
        primary: 0,
        ecd: 0,
        other: 0,
        total: 0,
      },
    ],
    ea_heatmap: { dates: [], eas: [] },
    distribution: [],
    school_summary: [],
  });

  assert.equal(parsed.success, false);
});

test("session review flags reject unexpected properties and under-counted totals", () => {
  const valid = {
    count: 1,
    flags: [
      {
        session_date: "2026-08-19",
        started_at: "2026-08-19T08:00:00.000Z",
        ended_at: null,
        submitting_ea_name: "Amahle Nkosi",
        school_id: "a0c54f15-e176-42c5-ad0e-300947557005",
        school_name: "Charles Duna Primary",
        child_first_name: "Sipho",
        child_last_name: "Dlamini",
        reason_code: "same_school_child_not_assigned_to_actor",
        created_at: "2026-08-19T08:31:00.000Z",
        last_observed_at: "2026-08-19T08:31:00.000Z",
      },
    ],
  };

  assert.equal(mobileSessionReviewFlagsSchema.safeParse(valid).success, true);
  assert.equal(
    mobileSessionReviewFlagsSchema.safeParse({
      ...valid,
      flags: [{ ...valid.flags[0], child_id: "00000000-0000-4000-8000-000000000099" }],
    }).success,
    false
  );
  assert.equal(
    mobileSessionReviewFlagsSchema.safeParse({ ...valid, count: 0 }).success,
    false
  );
});
