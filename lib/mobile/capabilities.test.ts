import assert from "node:assert/strict";
import test from "node:test";

import { ALL_MOBILE_ROLES, hasCapability } from "./capabilities";
import { resolveSyncIncidentPageRequest } from "./sync-incidents/page-access";

test("mobile.sessions.read is allowed only for the approved staff roles", () => {
  const allowed = [
    "junior_staff",
    "senior_staff",
    "admin",
    "zz_data_manager",
  ];
  const denied: unknown[] = [
    "funder",
    "ea",
    "teacher",
    "unknown_role",
    undefined,
    null,
  ];

  for (const role of allowed) {
    assert.equal(hasCapability(role, "mobile.sessions.read"), true, role);
  }

  for (const role of denied) {
    assert.equal(hasCapability(role, "mobile.sessions.read"), false, String(role));
  }
});

test("clock reads include junior staff but GPS-bearing exports do not", () => {
  assert.equal(
    hasCapability("junior_staff", "mobile.time_entries.read"),
    true
  );
  assert.equal(hasCapability("junior_staff", "mobile.csv.export"), false);

  for (const role of ["senior_staff", "admin", "zz_data_manager"]) {
    assert.equal(hasCapability(role, "mobile.time_entries.read"), true, role);
    assert.equal(hasCapability(role, "mobile.csv.export"), true, role);
  }
});

test("the email-bearing health board is limited to senior operational roles", () => {
  for (const role of ["senior_staff", "admin", "zz_data_manager"]) {
    assert.equal(hasCapability(role, "mobile.user_health.read"), true, role);
  }

  for (const role of ["junior_staff", "funder", "ea", "teacher"]) {
    assert.equal(hasCapability(role, "mobile.user_health.read"), false, role);
  }
});

test("sync incident alerts have exactly the User Health role set", () => {
  for (const role of ALL_MOBILE_ROLES) {
    assert.equal(
      hasCapability(role, "mobile.sync_incidents.read"),
      hasCapability(role, "mobile.user_health.read"),
      role
    );
  }
});

test("roster reassignment is an explicit admin and data-manager allow-list", () => {
  for (const role of ALL_MOBILE_ROLES) {
    assert.equal(
      hasCapability(role, "mobile.assignments.reassign"),
      role === "admin" || role === "zz_data_manager",
      role
    );
  }
});

test("capability drift produces a section-local denial without calling the loader", async () => {
  let calls = 0;
  const result = await resolveSyncIncidentPageRequest(
    "junior_staff",
    false,
    async () => {
      calls += 1;
      throw new Error("must not run");
    }
  );

  assert.equal(calls, 0);
  assert.deepEqual(result, {
    ok: false,
    status: 403,
    kind: "not_authorized",
    message: "Sync incident alerts are not available for this role.",
  });
});
