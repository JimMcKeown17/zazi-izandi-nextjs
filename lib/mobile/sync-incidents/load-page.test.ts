import assert from "node:assert/strict";
import test from "node:test";

import { createSyncIncidentPageLoader } from "./load-page";
import { VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD } from "./test-fixtures";
import type {
  MobileSyncIncidentFilters,
  MobileSyncIncidentsResult,
} from "./types";

const INPUT = {
  days: 7,
  schoolId: null,
  incidentKind: null,
  descriptorKey: null,
  limit: 50,
  cursor: "signed.page.one",
} as const;

test("the page loader fails closed before fetching for invalid input or current auth", async () => {
  let authorizationCalls = 0;
  let fetchCalls = 0;
  const invalidLoader = createSyncIncidentPageLoader({
    authorize: async () => {
      authorizationCalls += 1;
      return { ok: true, token: "token" };
    },
    fetchPage: async () => {
      fetchCalls += 1;
      return { ok: true, data: VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD };
    },
  });

  assert.deepEqual(
    await invalidLoader({ ...INPUT, raw_cursor: "forbidden" }),
    {
      ok: false,
      status: 400,
      kind: "invalid_request",
      message: "The next-page request is invalid.",
    }
  );
  assert.equal(authorizationCalls, 0);
  assert.equal(fetchCalls, 0);

  for (const authorization of [
    { ok: false as const, kind: "not_authenticated" as const },
    { ok: false as const, kind: "not_authorized" as const },
  ]) {
    const loader = createSyncIncidentPageLoader({
      authorize: async () => authorization,
      fetchPage: async () => {
        fetchCalls += 1;
        return { ok: true, data: VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD };
      },
    });
    const result = await loader(INPUT);
    assert.equal(result.ok, false);
    assert.equal(result.kind, authorization.kind);
  }
  assert.equal(fetchCalls, 0);
});

test("authorization exceptions become a static unavailable result without fetching or logging", async () => {
  let fetchCalls = 0;
  const logged: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => logged.push(args);
  try {
    const loader = createSyncIncidentPageLoader({
      authorize: async () => {
        throw new Error("clerk unavailable with sensitive context");
      },
      fetchPage: async () => {
        fetchCalls += 1;
        return { ok: true, data: VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD };
      },
    });

    assert.deepEqual(await loader(INPUT), {
      ok: false,
      status: 502,
      kind: "unavailable",
      message: "Sync incident alerts are temporarily unavailable.",
    });
    assert.equal(fetchCalls, 0);
    assert.deepEqual(logged, []);
  } finally {
    console.error = originalConsoleError;
  }
});

test("authorized page loads preserve opaque cursors across three pages and replay", async () => {
  const requested: MobileSyncIncidentFilters[] = [];
  const fetchPage = async (
    _token: string,
    filters: MobileSyncIncidentFilters
  ): Promise<MobileSyncIncidentsResult> => {
    requested.push(filters);
    const data = structuredClone(VALID_MOBILE_SYNC_INCIDENTS_PAYLOAD);
    data.next_cursor =
      filters.cursor === "signed.page.one"
        ? "signed.page.two"
        : filters.cursor === "signed.page.two"
          ? "signed.page.three"
          : null;
    return { ok: true, data };
  };
  const loader = createSyncIncidentPageLoader({
    authorize: async () => ({ ok: true, token: "current-clerk-token" }),
    fetchPage,
  });

  const pageTwo = await loader(INPUT);
  assert.equal(pageTwo.ok && pageTwo.data.next_cursor, "signed.page.two");
  const pageThree = await loader({ ...INPUT, cursor: "signed.page.two" });
  assert.equal(pageThree.ok && pageThree.data.next_cursor, "signed.page.three");
  const replay = await loader(INPUT);
  assert.equal(replay.ok && replay.data.next_cursor, "signed.page.two");
  assert.deepEqual(
    requested.map((filters) => filters.cursor),
    ["signed.page.one", "signed.page.two", "signed.page.one"]
  );
});
