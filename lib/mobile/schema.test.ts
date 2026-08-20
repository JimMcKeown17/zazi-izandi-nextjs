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
    applied_filters: { school_id: null, school_type: null },
    flags: [
      {
        session_id: "7c1f3f4a-2c8d-4a11-9c5e-2b6d1a0e9f11",
        child_id: "0d4b8e22-91a7-4c3f-8e5b-6a1c9d2f7b44",
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
      flags: [{ ...valid.flags[0], mutation_id: "00000000-0000-4000-8000-000000000099" }],
    }).success,
    false
  );
  assert.equal(
    mobileSessionReviewFlagsSchema.safeParse({
      ...valid,
      flags: [
        {
          session_date: valid.flags[0].session_date,
          started_at: valid.flags[0].started_at,
          ended_at: valid.flags[0].ended_at,
          submitting_ea_name: valid.flags[0].submitting_ea_name,
          school_id: valid.flags[0].school_id,
          school_name: valid.flags[0].school_name,
          child_first_name: valid.flags[0].child_first_name,
          child_last_name: valid.flags[0].child_last_name,
          reason_code: valid.flags[0].reason_code,
          created_at: valid.flags[0].created_at,
          last_observed_at: valid.flags[0].last_observed_at,
        },
      ],
    }).success,
    false
  );
  assert.equal(
    mobileSessionReviewFlagsSchema.safeParse({ ...valid, count: 0 }).success,
    false
  );
});
