import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import contract from "./capability_contract.json";
import { ALL_MOBILE_ROLES, ROLE_CAPABILITIES } from "./capabilities";

test("the pinned capability-contract digest matches Django's canonical capability map", () => {
  const canonical = JSON.stringify(contract.capabilities, Object.keys(contract.capabilities).sort());
  const digest = `sha256:${createHash("sha256").update(canonical).digest("hex")}`;

  assert.equal(contract.digest, "sha256:0fd14424876ccc7decfe6ab3b2b85039e860ef29cc4c072ac1cf98f23e2c809f");
  assert.equal(contract.digest, digest);
});

test("ROLE_CAPABILITIES agrees with the cross-repo fixture for every named capability", () => {
  for (const [capability, roles] of Object.entries(contract.capabilities)) {
    const actual = ALL_MOBILE_ROLES.filter((role) =>
      (ROLE_CAPABILITIES[role as keyof typeof ROLE_CAPABILITIES] ?? []).includes(
        capability as never
      )
    ).sort();
    assert.deepEqual(actual, [...roles].sort(), capability);
  }
});
