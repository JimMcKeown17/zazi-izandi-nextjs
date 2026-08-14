import assert from "node:assert/strict";
import test from "node:test";

import { buildSyncIncidentFilterHref } from "./filter-navigation";

test("alert filter navigation preserves health filters but always resets cursor scope", () => {
  const href = buildSyncIncidentFilterHref(
    "?days=30&school_id=00000000-0000-4000-8000-000000000010&q=fixture&cursor=signed-secret&actor_user_id=00000000-0000-4000-8000-000000000001",
    { incidentKind: "queue_overflow", descriptorKey: " time_entries " }
  );

  assert.equal(
    href,
    "/mobile-app/user-health?days=30&school_id=00000000-0000-4000-8000-000000000010&q=fixture&incident_kind=queue_overflow&descriptor_key=TIME_ENTRIES"
  );
  assert.doesNotMatch(href, /cursor|actor_user_id|signed-secret/);
});

test("clearing alert filters removes only alert-specific URL state", () => {
  assert.equal(
    buildSyncIncidentFilterHref(
      "?days=7&state=quiet&incident_kind=support_root&descriptor_key=TIME_ENTRIES",
      { incidentKind: null, descriptorKey: null }
    ),
    "/mobile-app/user-health?days=7&state=quiet"
  );
  assert.throws(
    () =>
      buildSyncIncidentFilterHref("", {
        incidentKind: null,
        descriptorKey: "invalid descriptor",
      }),
    /descriptor/
  );
});
