import assert from "node:assert/strict";
import test from "node:test";

import {
  PROGRAMME_FIDELITY_SCHOOL_ALIASES,
  classifyProgrammeFidelityRowCohort,
  filterProgrammeFidelityRowsByCohort,
} from "./cohorts";
import { VALID_CAUSAL_V2_PROGRAMME_FIDELITY_PAYLOAD } from "../mobile/programme-fidelity/test-fixtures";
import type { ProgrammeFidelityRowV2 } from "../mobile/programme-fidelity/types";

const row = (
  overrides: Partial<ProgrammeFidelityRowV2> = {}
): ProgrammeFidelityRowV2 => ({
  ...structuredClone(VALID_CAUSAL_V2_PROGRAMME_FIDELITY_PAYLOAD.rows[0]),
  ...overrides,
});

test("production-reviewed mobile school aliases map to exactly one canonical cohort", () => {
  assert.equal(PROGRAMME_FIDELITY_SCHOOL_ALIASES.length, 56);
  assert.equal(
    new Set(PROGRAMME_FIDELITY_SCHOOL_ALIASES.map(({ alias }) => alias)).size,
    PROGRAMME_FIDELITY_SCHOOL_ALIASES.length
  );

  for (const alias of PROGRAMME_FIDELITY_SCHOOL_ALIASES) {
    assert.deepEqual(
      classifyProgrammeFidelityRowCohort({
        school_name: `  ${alias.alias.toLowerCase().replaceAll(" ", "   ")}  `,
        school_type: "primary",
      }),
      { kind: "cohort", cohort: alias.cohort }
    );
  }
});

test("cohort classification is null-safe and never treats residual primary schools as ECD", () => {
  assert.deepEqual(
    classifyProgrammeFidelityRowCohort({ school_name: "ASTRA", school_type: "primary" }),
    { kind: "unrecognized" }
  );
  assert.deepEqual(
    classifyProgrammeFidelityRowCohort({ school_name: "Astra", school_type: " eCd " }),
    { kind: "cohort", cohort: "ecd" }
  );
  assert.deepEqual(
    classifyProgrammeFidelityRowCohort({ school_name: null, school_type: null }),
    { kind: "missing" }
  );
  assert.deepEqual(
    classifyProgrammeFidelityRowCohort({ school_name: "   ", school_type: "primary" }),
    { kind: "missing" }
  );
  assert.deepEqual(
    classifyProgrammeFidelityRowCohort({ school_name: "Unknown", school_type: "other" }),
    { kind: "unrecognized" }
  );
});

test("programme-fidelity cohort filtering removes former owners before attribution", () => {
  const rows = [
    row({ group_id: "00000000-0000-4000-8000-000000000061", school_name: "ABRAHAM LEVY" }),
    row({ group_id: "00000000-0000-4000-8000-000000000062", school_name: "KWANOXOLO" }),
    row({ group_id: "00000000-0000-4000-8000-000000000063", school_name: "ECD One", school_type: "ecd" }),
    row({ group_id: "00000000-0000-4000-8000-000000000064", school_name: null, school_type: null }),
    row({ group_id: "00000000-0000-4000-8000-000000000065", school_name: "ASTRA", school_type: "primary" }),
    row({
      group_id: "00000000-0000-4000-8000-000000000066",
      school_name: null,
      school_type: null,
      is_current_owner: false,
    }),
  ];

  const treatment = filterProgrammeFidelityRowsByCohort(rows, "treatment");
  assert.deepEqual(treatment.rows.map(({ group_id }) => group_id), [rows[0].group_id]);
  assert.deepEqual(treatment.exclusionCounts, {
    missingSchoolEvidence: 1,
    unrecognizedSchoolEvidence: 1,
  });

  assert.deepEqual(
    filterProgrammeFidelityRowsByCohort(rows, "sef").rows.map(({ group_id }) => group_id),
    [rows[1].group_id]
  );
  assert.deepEqual(
    filterProgrammeFidelityRowsByCohort(rows, "ecd").rows.map(({ group_id }) => group_id),
    [rows[2].group_id]
  );

  const all = filterProgrammeFidelityRowsByCohort(rows, "all");
  assert.equal(all.rows.length, 5);
  assert.deepEqual(all.exclusionCounts, {
    missingSchoolEvidence: 0,
    unrecognizedSchoolEvidence: 0,
  });
});
