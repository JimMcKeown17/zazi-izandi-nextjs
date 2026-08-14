import assert from "node:assert/strict";
import test from "node:test";

import { buildSyncIncidentsRequest } from "./request";

const SCHOOL_ID = "00000000-0000-4000-8000-000000000010";

test("sync incident requests are deterministic, bounded, signed-cursor-only GETs", () => {
  const request = buildSyncIncidentsRequest("clerk-session-token", {
    days: 7,
    schoolId: SCHOOL_ID,
    incidentKind: "support_root",
    descriptorKey: "TIME_ENTRIES",
    limit: 50,
    cursor: "signed.cursor.v1",
  });

  assert.equal(
    request.path,
    "/api/mobile/sync-incidents/?days=7&limit=50&school_id=00000000-0000-4000-8000-000000000010&incident_kind=support_root&descriptor_key=TIME_ENTRIES&cursor=signed.cursor.v1"
  );
  assert.equal(request.init.cache, "no-store");
  assert.equal(request.init.method, "GET");
  assert.equal(request.init.redirect, "manual");
  assert.equal(
    new Headers(request.init.headers).get("Authorization"),
    "Bearer clerk-session-token"
  );
  assert.doesNotMatch(request.path, /cursor_received_at|cursor_actor|snapshot/);
});

test("sync incident request validation fails closed", () => {
  const valid = { days: 7, limit: 50 } as const;

  assert.throws(() => buildSyncIncidentsRequest("", valid), /session token/);
  assert.throws(
    () => buildSyncIncidentsRequest("token", { ...valid, days: 0 }),
    /days/
  );
  assert.throws(
    () => buildSyncIncidentsRequest("token", { ...valid, limit: 101 }),
    /limit/
  );
  assert.throws(
    () =>
      buildSyncIncidentsRequest("token", {
        ...valid,
        schoolId: "not-a-uuid",
      }),
    /schoolId/
  );
  assert.throws(
    () =>
      buildSyncIncidentsRequest("token", {
        ...valid,
        descriptorKey: "time_entries",
      }),
    /descriptorKey/
  );
  assert.throws(
    () =>
      buildSyncIncidentsRequest("token", {
        ...valid,
        cursor: "signed-\u2603",
      }),
    /cursor/
  );
  assert.throws(
    () =>
      buildSyncIncidentsRequest("token", {
        ...valid,
        cursor: "x".repeat(2049),
      }),
    /cursor/
  );
});
