import assert from "node:assert/strict";
import test from "node:test";

import { hasCapability } from "./capabilities";

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
