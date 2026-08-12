import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AttendanceLedger } from "@/components/mobile-app/attendance/attendance-ledger";
import { VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD } from "./test-fixtures";

const entries = VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD.entries;

test("the EA view renders one aggregated row per EA", () => {
  const html = renderToStaticMarkup(
    createElement(AttendanceLedger, { entries, initialView: "ea" })
  );
  assert.match(html, /Asemahle Mancayi/);
  assert.match(html, /Lihle Jacobs/);
  assert.match(html, /Days clocked/i);
  assert.match(html, /Auto clock-outs/i);
});

test("an initial query narrows both views and explains the summary scope", () => {
  const html = renderToStaticMarkup(
    createElement(AttendanceLedger, { entries, initialQuery: "Lihle" })
  );
  assert.match(html, /Lihle Jacobs/);
  assert.doesNotMatch(html, /Asemahle Mancayi/);
  assert.match(html, /does not change the summary tiles/i);
});
