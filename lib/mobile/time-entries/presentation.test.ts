import assert from "node:assert/strict";
import test from "node:test";

import { formatDuration, getTimeEntryState } from "./presentation";
import { VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD } from "./test-fixtures";

test("clock durations remain readable across minute and multi-hour values", () => {
  assert.equal(formatDuration(47), "47m");
  assert.equal(formatDuration(480), "8h 00m");
  assert.equal(formatDuration(601), "10h 01m");
});
test("clock status prioritizes open and automatic evidence", () => {
  const [active, automatic, completed] =
    VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD.entries;
  assert.equal(getTimeEntryState(active), "active");
  assert.equal(getTimeEntryState(automatic), "automatic");
  assert.equal(getTimeEntryState(completed), "completed");
});
