import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPayPeriodWindows,
  defaultSessionExportRange,
  getSastToday,
  resolveSessionExportDates,
  validateSessionExportRange,
} from "./date-range";

test("switching back to pay-period derives the displayed window instead of stale custom dates", () => {
  const windows = buildPayPeriodWindows("2026-09-01");
  assert.deepEqual(resolveSessionExportDates({
    mode: "pay-period",
    windows,
    selectedPayRun: "2026-03-20",
    customStartDate: "2026-07-01",
    customEndDate: "2026-07-31",
  }), {
    startDate: "2026-02-20",
    endDate: "2026-03-19",
  });
});

test("20 March pay-run window is exactly 20 February through 19 March", () => {
  const windows = buildPayPeriodWindows("2026-03-20");
  assert.deepEqual(windows[0], {
    payRunDate: "2026-03-20",
    startDate: "2026-02-20",
    endDate: "2026-03-19",
    label: "20 March 2026 pay-run window · 20 Feb–19 Mar",
  });
});

test("January pay-run window crosses the calendar-year boundary", () => {
  const windows = buildPayPeriodWindows("2026-01-20");
  assert.deepEqual(windows, [
    {
      payRunDate: "2026-01-20",
      startDate: "2025-12-20",
      endDate: "2026-01-19",
      label: "20 January 2026 pay-run window · 20 Dec–19 Jan",
    },
  ]);
});

test("current-year windows are generated newest-first and only after their end date", () => {
  const windows = buildPayPeriodWindows("2028-03-19");
  assert.deepEqual(
    windows.map((window) => window.payRunDate),
    ["2028-02-20", "2028-01-20"]
  );
  assert.deepEqual(windows[0], {
    payRunDate: "2028-02-20",
    startDate: "2028-01-20",
    endDate: "2028-02-19",
    label: "20 February 2028 pay-run window · 20 Jan–19 Feb",
  });
});

test("default range uses newest closed-date window, or a 30-day custom range before 20 January", () => {
  assert.deepEqual(defaultSessionExportRange("2026-03-20"), {
    source: "pay-period",
    startDate: "2026-02-20",
    endDate: "2026-03-19",
    payRunDate: "2026-03-20",
  });
  assert.deepEqual(defaultSessionExportRange("2026-01-10"), {
    source: "custom",
    startDate: "2025-12-12",
    endDate: "2026-01-10",
    payRunDate: null,
  });
});

test("South African today does not use the UTC calendar day", () => {
  assert.equal(getSastToday(new Date("2026-09-01T21:59:59Z")), "2026-09-01");
  assert.equal(getSastToday(new Date("2026-09-01T22:00:00Z")), "2026-09-02");
});

test("custom range accepts leap day and returns its exact inclusive day count", () => {
  assert.deepEqual(
    validateSessionExportRange({
      startDate: "2028-02-20",
      endDate: "2028-03-19",
      today: "2028-03-20",
    }),
    { startDate: "2028-02-20", endDate: "2028-03-19", inclusiveDays: 29 }
  );
});

test("custom range rejects normalized, reversed, future, and over-366-day dates", () => {
  for (const input of [
    { startDate: "2026-02-30", endDate: "2026-03-19", today: "2026-03-20" },
    { startDate: "2026-03-20", endDate: "2026-03-19", today: "2026-03-20" },
    { startDate: "2026-02-20", endDate: "2026-03-21", today: "2026-03-20" },
    { startDate: "2025-03-19", endDate: "2026-03-20", today: "2026-03-20" },
  ]) {
    assert.throws(() => validateSessionExportRange(input), RangeError);
  }
});
