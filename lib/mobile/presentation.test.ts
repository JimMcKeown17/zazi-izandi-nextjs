import assert from "node:assert/strict";
import test from "node:test";

import {
  getSchoolTypeDisplay,
  shouldShowOtherTrend,
  toHeatmapDisplayRows,
} from "./presentation";

test("mobile heatmap rows retain the Supabase actor UUID as their render identity", () => {
  const rows = toHeatmapDisplayRows([
    {
      user_id: "3eb26195-c9b4-41a2-a01d-3b341a28177e",
      ea_name: "Asemahle Mancayi",
      current_school_id: "a0c54f15-e176-42c5-ad0e-300947557005",
      current_school: "Charles Duna Primary",
      employment_status: "active",
      cells: [0, 2, 1],
      total_sessions: 3,
      present_attendees: 14,
      days_worked: 2,
      avg_per_day_worked: 1.5,
    },
  ]);

  assert.deepEqual(rows, [
    {
      row_id: "3eb26195-c9b4-41a2-a01d-3b341a28177e",
      ea_name: "Asemahle Mancayi",
      school: "Charles Duna Primary",
      cells: [0, 2, 1],
      total_sessions: 3,
    },
  ]);
});

test("the Other trend series is shown exactly when unexplained sessions exist", () => {
  assert.equal(
    shouldShowOtherTrend([
      { date: "2026-08-09", primary: 2, ecd: 1, other: 0, total: 3 },
      { date: "2026-08-10", primary: 1, ecd: 0, other: 2, total: 3 },
    ]),
    true
  );
  assert.equal(
    shouldShowOtherTrend([
      { date: "2026-08-10", primary: 1, ecd: 0, other: 0, total: 1 },
    ]),
    false
  );
});

test("school type display never coerces missing or unknown values to Primary", () => {
  assert.deepEqual(getSchoolTypeDisplay(null), {
    label: "—",
    kind: "unknown",
  });
  assert.deepEqual(getSchoolTypeDisplay("High School"), {
    label: "High School",
    kind: "other",
  });
  assert.deepEqual(getSchoolTypeDisplay(" primary school "), {
    label: "Primary",
    kind: "primary",
  });
  assert.deepEqual(getSchoolTypeDisplay("ecd"), {
    label: "ECD",
    kind: "ecd",
  });
});
