import assert from "node:assert/strict";
import test from "node:test";

import { buildChaseListCsv, buildChaseListText } from "./export";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "./test-fixtures";

const context = {
  days: 30,
  generatedAt: VALID_MOBILE_USER_HEALTH_PAYLOAD.generated_at,
  schoolId: null,
  schoolName: null,
};

test("the CSV has a header, one line per EA, and self-describing window and scope columns", () => {
  const csv = buildChaseListCsv(VALID_MOBILE_USER_HEALTH_PAYLOAD.users, context);
  const lines = csv.trimEnd().split("\r\n");
  assert.equal(
    lines[0],
    '"name","email","current_school","employment_status","status_in_window","blockers","last_activity_at","activity_window_days","generated_at","scope_school_id","scope_school_name","user_id"'
  );
  assert.equal(lines.length, VALID_MOBILE_USER_HEALTH_PAYLOAD.users.length + 1);
  assert.match(lines[1], /"30","2026-08-11T14:30:00\.000Z","all","all schools"/);
});

test("exports differing only in window or only in school scope stay distinguishable", () => {
  const users = VALID_MOBILE_USER_HEALTH_PAYLOAD.users;
  const sevenDay = buildChaseListCsv(users, { ...context, days: 7 });
  const ninetyDay = buildChaseListCsv(users, { ...context, days: 90 });
  assert.notEqual(sevenDay, ninetyDay);

  const schoolScoped = buildChaseListCsv(users, {
    ...context,
    schoolId: "a0c54f15-e176-42c5-ad0e-300947557005",
    schoolName: "Charles Duna Primary",
  });
  assert.notEqual(schoolScoped, buildChaseListCsv(users, context));
  assert.match(schoolScoped, /"Charles Duna Primary"/);
});

test("cells that could execute as spreadsheet formulas are neutralized", () => {
  const hostile = {
    ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0],
    display_name: "=HYPERLINK(evil)",
  };
  const csv = buildChaseListCsv([hostile], context);
  assert.match(csv, /"'=HYPERLINK\(evil\)"/);
});

test("CSV cells quote embedded delimiters and double embedded quotes", () => {
  const punctuated = {
    ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0],
    display_name: 'Mancayi, "Asemahle"',
  };
  const csv = buildChaseListCsv([punctuated], context);
  assert.match(csv, /"Mancayi, ""Asemahle"""/);
});

test("the copyable text opens with its own window context and reads one line per EA", () => {
  const text = buildChaseListText(
    [VALID_MOBILE_USER_HEALTH_PAYLOAD.users[1]],
    context
  );
  const [header] = text.split("\n");
  assert.match(header, /last 30 days/i);
  assert.match(text, / — /);
  assert.match(text, /Groups missing|Group memberships incomplete/);
});

test("a zero-row copy remains self-describing", () => {
  const text = buildChaseListText([], context);
  assert.match(text, /last 30 days/i);
  assert.match(text, /all schools/i);
  assert.match(text, new RegExp(VALID_MOBILE_USER_HEALTH_PAYLOAD.generated_at));
});

test("a blocked-but-active EA shows both axes in copied text", () => {
  const blockedButActive = {
    ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0],
    auth: {
      ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0].auth,
      state: "unconfirmed" as const,
    },
  };
  const text = buildChaseListText([blockedButActive], context);
  assert.match(text, /active · 30d/);
  assert.match(text, /blockers: Auth blocked/);
});

test("a resigned EA is never exported as if they were current staff", () => {
  const resigned = {
    ...VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0],
    employment_status: "resigned",
  };
  const csv = buildChaseListCsv([resigned], context);
  assert.match(csv, /"resigned"/);
  const text = buildChaseListText([resigned], context);
  assert.match(text, /Resigned/);
});
