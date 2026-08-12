import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AttendanceLedger } from "@/components/mobile-app/attendance/attendance-ledger";
import { VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD } from "./test-fixtures";

const entries = VALID_MOBILE_TIME_ENTRIES_ACTIVITY_PAYLOAD.entries;

test("the EA view renders one aggregated row per EA", () => {
  const html = renderToStaticMarkup(
    createElement(AttendanceLedger, {
      entries,
      days: 30,
      schoolId: null,
      initialView: "ea",
    })
  );
  assert.match(html, /Asemahle Mancayi/);
  assert.match(html, /Lihle Jacobs/);
  assert.match(html, /Days clocked/i);
  assert.match(html, /Auto clock-outs/i);
});

test("an initial query narrows both views and explains the summary scope", () => {
  const html = renderToStaticMarkup(
    createElement(AttendanceLedger, {
      entries,
      days: 30,
      schoolId: null,
      initialQuery: "Lihle",
    })
  );
  assert.match(html, /Lihle Jacobs/);
  assert.doesNotMatch(html, /Asemahle Mancayi/);
  assert.match(html, /does not change the summary tiles/i);
});

test("ledger rows link each EA to their user health row, preserving window and school scope", () => {
  const withLinks = renderToStaticMarkup(
    createElement(AttendanceLedger, {
      entries,
      days: 7,
      schoolId: "a0c54f15-e176-42c5-ad0e-300947557005",
      initialView: "ea",
      userHealthLinksEnabled: true,
    })
  );
  assert.match(
    withLinks,
    /href="\/mobile-app\/user-health\?days=7&amp;school_id=a0c54f15-e176-42c5-ad0e-300947557005&amp;q=3eb26195-c9b4-41a2-a01d-3b341a28177e"/
  );

  const withoutLinks = renderToStaticMarkup(
    createElement(AttendanceLedger, {
      entries,
      days: 7,
      schoolId: null,
      initialView: "ea",
    })
  );
  assert.doesNotMatch(withoutLinks, /\/mobile-app\/user-health\?/);
});
