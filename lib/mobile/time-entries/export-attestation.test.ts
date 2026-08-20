import assert from "node:assert/strict";
import test from "node:test";

import { csvSchoolTypeAttestationSatisfied } from "./export-attestation";

test("an unfiltered export needs no attestation, with or without a header", () => {
  assert.equal(csvSchoolTypeAttestationSatisfied(null, null), true);
  assert.equal(csvSchoolTypeAttestationSatisfied("none", null), true);
  assert.equal(csvSchoolTypeAttestationSatisfied("primary", null), true);
});

test("a filtered export is confirmed only by an exact matching attestation", () => {
  assert.equal(csvSchoolTypeAttestationSatisfied("ecd", "ecd"), true);
  assert.equal(csvSchoolTypeAttestationSatisfied("primary", "primary"), true);
});

test("a legacy backend that omits the header fails closed for a filtered export", () => {
  // Simulates Next.js deployed before Django: the header is absent, so the
  // unfiltered CSV must never be presented as an ECD/Primary export.
  assert.equal(csvSchoolTypeAttestationSatisfied(null, "ecd"), false);
  assert.equal(csvSchoolTypeAttestationSatisfied("none", "primary"), false);
});

test("a mismatched attestation fails closed", () => {
  assert.equal(csvSchoolTypeAttestationSatisfied("primary", "ecd"), false);
  assert.equal(csvSchoolTypeAttestationSatisfied("ecd", "primary"), false);
});
