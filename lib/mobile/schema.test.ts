import assert from "node:assert/strict";
import test from "node:test";

import { mobileSessionsActivitySchema } from "./schema";

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
