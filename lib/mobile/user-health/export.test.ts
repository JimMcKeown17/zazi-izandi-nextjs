import assert from "node:assert/strict";
import test from "node:test";

import { buildChaseListCsv, buildChaseListText } from "./export";
import { VALID_MOBILE_USER_HEALTH_PAYLOAD } from "./test-fixtures";

const LEGACY_HEADER =
  '"name","email","current_school","employment_status","status_in_window","blockers","last_activity_at","activity_window_days","generated_at","scope_school_id","scope_school_name","user_id"';
const PART_B_HEADER =
  '"name","email","current_school","employment_status","stage","active_in_window","quiet","blockers","last_activity_at","activity_window_days","generated_at","scope_school_id","scope_school_name","user_id","wave_name","last_ever_activity_at","last_app_open_at"';

const context = {
  days: 30,
  generatedAt: VALID_MOBILE_USER_HEALTH_PAYLOAD.generated_at,
  schoolId: null,
  schoolName: null,
};

function parseCsvLine(line: string): string[] {
  const cells = Array.from(
    line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g),
    (match) => match[1].replaceAll('""', '"')
  );
  assert.equal(cells.length > 0, true, `expected quoted CSV cells in ${line}`);
  return cells;
}

function csvRecords(csv: string): Array<Record<string, string>> {
  const lines = csv.trimEnd().split("\r\n");
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    assert.equal(values.length, header.length);
    return Object.fromEntries(
      header.map((column, index) => [column, values[index]])
    );
  });
}

test("the Part B CSV names durable and windowed axes explicitly and remains self-describing", () => {
  const csv = buildChaseListCsv(VALID_MOBILE_USER_HEALTH_PAYLOAD.users, context);
  const lines = csv.trimEnd().split("\r\n");
  assert.equal(lines[0], PART_B_HEADER);
  assert.equal(lines.length, VALID_MOBILE_USER_HEALTH_PAYLOAD.users.length + 1);
  assert.match(lines[1], /"30","2026-08-11T14:30:00\.000Z","all","all schools"/);
});

test("the Part B CSV exports durable stage, active-in-window, quiet, wave, and app-open evidence honestly", () => {
  const records = csvRecords(
    buildChaseListCsv(VALID_MOBILE_USER_HEALTH_PAYLOAD.users, context)
  );
  const byName = new Map(records.map((record) => [record.name, record]));

  assert.deepEqual(
    {
      stage: byName.get("Lihle Jacobs")?.stage,
      active_in_window: byName.get("Lihle Jacobs")?.active_in_window,
      quiet: byName.get("Lihle Jacobs")?.quiet,
    },
    { stage: "activated", active_in_window: "false", quiet: "true" }
  );
  assert.deepEqual(
    {
      active_in_window: byName.get("Asemahle Mancayi")?.active_in_window,
      quiet: byName.get("Asemahle Mancayi")?.quiet,
    },
    { active_in_window: "true", quiet: "false" }
  );
  assert.deepEqual(
    {
      stage: byName.get("Ayanda Ndlovu")?.stage,
      last_app_open_at: byName.get("Ayanda Ndlovu")?.last_app_open_at,
      wave_name: byName.get("Ayanda Ndlovu")?.wave_name,
    },
    {
      stage: "reached",
      last_app_open_at: "2026-08-11T07:05:00.000Z",
      wave_name: "ZZ ECD 2026",
    }
  );
  assert.ok(
    records.every(
      (record) =>
        !(record.active_in_window === "true" && record.quiet === "true")
    ),
    "no exported row may be both active in the window and quiet"
  );
});

test("the degraded CSV branch preserves the exact pre-Part-B header", () => {
  const csv = buildChaseListCsv(
    VALID_MOBILE_USER_HEALTH_PAYLOAD.users,
    context,
    { partB: false }
  );
  assert.equal(csv.split("\r\n")[0], LEGACY_HEADER);
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
  assert.match(text, /activated · active 30d/);
  assert.match(text, /blockers: Auth blocked/);
});

test("copied text keeps the durable stage separate from its windowed active or quiet marker", () => {
  const active = VALID_MOBILE_USER_HEALTH_PAYLOAD.users[0];
  const quiet = VALID_MOBILE_USER_HEALTH_PAYLOAD.users[1];
  const text = buildChaseListText([active, quiet], context);

  assert.match(text, /Asemahle Mancayi — activated · active 30d/);
  assert.match(text, /Lihle Jacobs — activated · quiet 30d/);
  assert.doesNotMatch(text, /activated · 30d/);
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
