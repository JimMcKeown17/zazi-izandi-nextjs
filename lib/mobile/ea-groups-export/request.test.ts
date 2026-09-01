import assert from "node:assert/strict";
import test from "node:test";

import { buildEaGroupsExportRequest } from "./request";

test("builds the exact no-query Django export request with Clerk bearer auth", () => {
  assert.deepEqual(buildEaGroupsExportRequest("signed-token"), {
    path: "/api/mobile/exports/ea-groups/",
    init: {
      cache: "no-store",
      headers: { Authorization: "Bearer signed-token" },
    },
  });
  assert.throws(() => buildEaGroupsExportRequest(""), /session token/i);
});
