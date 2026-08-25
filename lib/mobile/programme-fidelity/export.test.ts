import assert from "node:assert/strict";
import test from "node:test";

import { buildProgrammeFidelityCsv } from "./export";
import { VALID_PROGRAMME_FIDELITY_PAYLOAD } from "./test-fixtures";

test("the CSV contains only decoded coaching fields with RFC 4180 quoting", () => {
  const csv = buildProgrammeFidelityCsv(VALID_PROGRAMME_FIDELITY_PAYLOAD.rows);
  assert.match(csv, /^\uFEFF"EA","Group","School"/);
  assert.match(csv, /"Coach One","Group 1","School One"/);
  assert.doesNotMatch(csv, /group_id|ea_user_id|class_id|00000000-/i);
  assert.equal(csv.endsWith("\r\n"), true);
});

test("formula-leading and delimiter-bearing labels cannot execute in spreadsheets", () => {
  const hostile = {
    ...VALID_PROGRAMME_FIDELITY_PAYLOAD.rows[0],
    ea_display_name: "=HYPERLINK(\"bad\")",
    group_name: "+SUM(1,2)",
    school_name: "School, \"One\"",
  };
  const csv = buildProgrammeFidelityCsv([hostile]);
  assert.match(csv, /"'=HYPERLINK\(""bad""\)"/);
  assert.match(csv, /"'\+SUM\(1,2\)"/);
  assert.match(csv, /"School, ""One"""/);
});
