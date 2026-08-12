import assert from "node:assert/strict";
import test from "node:test";

import { buildDailyClockSeries } from "./daily-series";
import { VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD } from "./test-fixtures";

test("the series zero-fills every SAST day in the window and counts distinct EAs", () => {
  const series = buildDailyClockSeries(
    VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD.entries,
    7,
    "2026-08-11T14:30:00.000Z"
  );
  assert.equal(series.length, 7);
  assert.equal(series[0].date, "2026-08-05");
  assert.equal(series[6].date, "2026-08-11");
  assert.deepEqual(
    series.map((point) => point.distinct_eas),
    [0, 0, 0, 0, 1, 1, 1]
  );
});

test("two shifts by one EA on one day count once", () => {
  const [entry] = VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD.entries;
  const series = buildDailyClockSeries(
    [entry, { ...entry, id: "duplicate-day" }],
    1,
    "2026-08-11T14:30:00.000Z"
  );
  assert.deepEqual(series, [{ date: "2026-08-11", distinct_eas: 1 }]);
});
