import assert from "node:assert/strict";
import test from "node:test";

import { buildEaClockRollups } from "./rollup";
import { VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD } from "./test-fixtures";

test("rollups aggregate shifts per EA with distinct days and completed-only durations", () => {
  const rollups = buildEaClockRollups(
    VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD.entries
  );
  assert.equal(rollups.length, 2);

  const [asemahle, lihle] = rollups;
  assert.equal(asemahle.ea_name, "Asemahle Mancayi");
  assert.equal(asemahle.days_clocked, 2);
  assert.equal(asemahle.completed_entries, 1);
  assert.equal(asemahle.total_completed_minutes, 480);
  assert.equal(asemahle.average_shift_minutes, 480);
  assert.equal(asemahle.automatic_clock_outs, 0);
  assert.equal(asemahle.automatic_rate, 0);
  assert.equal(asemahle.open_now, true);
  assert.equal(asemahle.last_clock_in_at, "2026-08-11T06:10:00.000Z");

  assert.equal(lihle.ea_name, "Lihle Jacobs");
  assert.equal(lihle.days_clocked, 1);
  assert.equal(lihle.automatic_clock_outs, 1);
  assert.equal(lihle.automatic_rate, 1);
  assert.equal(lihle.open_now, false);
});

test("an EA with no completed shifts has null averages, not divide-by-zero artifacts", () => {
  const openOnly = VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD.entries.filter(
    (entry) => entry.duration_minutes === null
  );
  const [rollup] = buildEaClockRollups(openOnly);
  assert.equal(rollup.completed_entries, 0);
  assert.equal(rollup.average_shift_minutes, null);
  assert.equal(rollup.automatic_rate, null);
});
