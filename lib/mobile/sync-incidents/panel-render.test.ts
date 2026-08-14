import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SyncIncidentAlerts } from "@/components/mobile-app/sync-incidents/sync-incident-alerts";
import { VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD } from "./test-fixtures";

function visibleText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

test("the alert panel renders historical evidence, profile authority, and bounded detail", () => {
  const html = renderToStaticMarkup(
    createElement(SyncIncidentAlerts, {
      result: { ok: true, data: VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD },
    })
  );
  const text = visibleText(html);

  assert.match(html, /data-testid="mobile-sync-incident-alerts-success"/);
  assert.match(text, /Sync incident alerts/);
  assert.match(text, /Receipts 1/);
  assert.match(text, /Affected users 1/);
  assert.match(text, /Saved-change support receipts 1/);
  assert.match(text, /Sync-integrity findings reported 0/);
  assert.match(text, /Diagnostic coverage constrained 0/);
  assert.match(text, /Newest backend receipt/);
  assert.match(text, /Fixture EA/);
  assert.match(text, /Current school: Fixture Primary School/);
  assert.match(text, /Saved-change support receipt/);
  assert.match(
    text,
    /The phone reported that this mutation was in a support state when the receipt was created/
  );
  assert.match(text, /Received by server/);
  assert.match(text, /First reported as observed on device/);
  assert.match(text, /Last reported as observed on device/);
  assert.match(
    text,
    /The server received this later than the device-reported observation time/
  );
  assert.match(
    text,
    /Connectivity, app activation, and device-clock differences can contribute/
  );
  assert.match(text, /Technical detail/);
  assert.match(
    html,
    /<details[^>]*data-testid="mobile-sync-incident-receipts"(?![^>]*\sopen(?:=|\s|>))/
  );
  assert.match(text, /View 1 receipt/);
  assert.match(html, /href="\/mobile-app\/users\/00000000-0000-4000-8000-000000000001"/);
  assert.doesNotMatch(text, /unresolved|still active|lost work|corrupted/i);
  assert.doesNotMatch(html, /normalized_payload|fixture@example\.org/);
});

test("unknown classification tokens cannot resolve through Object prototype keys", () => {
  for (const errorCode of ["constructor", "toString", "__proto__", "valueOf"]) {
    const payload = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
    payload.incidents[0].receipt.error_code = errorCode;
    const html = renderToStaticMarkup(
      createElement(SyncIncidentAlerts, {
        result: { ok: true, data: payload },
      })
    );
    assert.match(
      visibleText(html),
      /bounded technical classification for investigation/,
      errorCode
    );
  }
});

test("an actor without a current school is labelled honestly", () => {
  const payload = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
  payload.incidents[0].actor.current_school_id = null;
  payload.incidents[0].actor.current_school = null;

  const text = visibleText(
    renderToStaticMarkup(
      createElement(SyncIncidentAlerts, {
        result: { ok: true, data: payload },
      })
    )
  );
  assert.match(text, /Current school: No current school recorded/);
  assert.doesNotMatch(text, /Current school: School name unavailable/);
});

test("the delayed-receipt note preserves microsecond ordering", () => {
  const payload = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
  payload.incidents[0].receipt.first_seen_at = "2026-08-14T11:55:00.000Z";
  payload.incidents[0].receipt.received_at = "2026-08-14T11:55:00.000001Z";
  payload.summary.newest_received_at = payload.incidents[0].receipt.received_at;

  const text = visibleText(
    renderToStaticMarkup(
      createElement(SyncIncidentAlerts, {
        result: { ok: true, data: payload },
      })
    )
  );
  assert.match(text, /The server received this later/);
});

test("empty, unauthorized, and unavailable alert states stay distinct", () => {
  const empty = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
  empty.summary = {
    receipts: 0,
    affected_users: 0,
    support_roots: 0,
    integrity_findings: 0,
    coverage_constrained: 0,
    newest_received_at: null,
  };
  empty.page_count = 0;
  empty.incidents = [];

  const emptyText = visibleText(
    renderToStaticMarkup(
      createElement(SyncIncidentAlerts, {
        result: { ok: true, data: empty },
      })
    )
  );
  assert.match(emptyText, /No sync-support receipts were received/);
  assert.match(emptyText, /does not prove every eligible phone/);

  const deniedHtml = renderToStaticMarkup(
    createElement(SyncIncidentAlerts, {
      result: {
        ok: false,
        status: 403,
        kind: "not_authorized",
        message: "Sync incident alerts are not available for this role.",
      },
    })
  );
  assert.match(deniedHtml, /data-testid="mobile-sync-incident-alerts-denied"/);
  assert.match(visibleText(deniedHtml), /not available for this role/);

  const unavailableHtml = renderToStaticMarkup(
    createElement(SyncIncidentAlerts, {
      result: {
        ok: false,
        status: 502,
        kind: "unavailable",
        message: "Sync incident alerts are temporarily unavailable.",
      },
    })
  );
  assert.match(
    unavailableHtml,
    /data-testid="mobile-sync-incident-alerts-unavailable"/
  );
  assert.match(visibleText(unavailableHtml), /separate User Health evidence remains valid/);
});
