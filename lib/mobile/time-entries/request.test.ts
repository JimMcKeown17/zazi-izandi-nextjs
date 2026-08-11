import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTimeEntriesActivityRequest,
  buildTimeEntriesExportRequest,
} from "./request";

test("clock report and CSV requests use fixed endpoints, filters, and bearer auth", () => {
  const filters = {
    days: 30,
    schoolId: "a0c54f15-e176-42c5-ad0e-300947557005",
  };
  const report = buildTimeEntriesActivityRequest("session-token", filters);
  const csv = buildTimeEntriesExportRequest("session-token", filters);

  assert.equal(
    report.path,
    "/api/mobile/time-entries/?days=30&school_id=a0c54f15-e176-42c5-ad0e-300947557005"
  );
  assert.equal(
    csv.path,
    "/api/mobile/exports/time-entries/?days=30&school_id=a0c54f15-e176-42c5-ad0e-300947557005"
  );
  assert.equal(report.init.cache, "no-store");
  assert.equal(
    new Headers(report.init.headers).get("Authorization"),
    "Bearer session-token"
  );
  assert.throws(
    () => buildTimeEntriesActivityRequest("token", { days: 0 }),
    /between 1 and 90/
  );
});
