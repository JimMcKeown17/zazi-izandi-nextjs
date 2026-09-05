import assert from "node:assert/strict";
import test from "node:test";

import {
  eaGroupsDownloadFilename,
  readBoundedResponseBytes,
} from "./transport";

const utf8 = new TextEncoder();

test("reads streamed bytes without decoding away BOM or CRLF", async () => {
  const expected = Uint8Array.from([
    0xef, 0xbb, 0xbf,
    ...utf8.encode("a,b\r\n\"1\",\"2\"\r\n"),
  ]);
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(expected.slice(0, 5));
        controller.enqueue(expected.slice(5));
        controller.close();
      },
    })
  );

  const actual = await readBoundedResponseBytes(response, expected.byteLength);

  assert.deepEqual(actual, expected);
});

test("rejects declared and chunked bodies above the exact byte ceiling", async () => {
  const declared = new Response("ignored", {
    headers: { "Content-Length": "11" },
  });
  await assert.rejects(
    () => readBoundedResponseBytes(declared, 10),
    /safe byte limit/i
  );

  let cancelled = false;
  const chunked = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(utf8.encode("12345678"));
        controller.enqueue(utf8.encode("9"));
      },
      cancel() {
        cancelled = true;
      },
    })
  );
  await assert.rejects(
    () => readBoundedResponseBytes(chunked, 8),
    /safe byte limit/i
  );
  assert.equal(cancelled, true);
});

test("rejects a missing or empty successful body", async () => {
  await assert.rejects(
    () => readBoundedResponseBytes(new Response(null)),
    /missing/i
  );
  await assert.rejects(
    () => readBoundedResponseBytes(new Response(new Uint8Array())),
    /missing/i
  );
});

test("the dated filename uses the UTC date across the midnight boundary", () => {
  assert.equal(
    eaGroupsDownloadFilename(new Date("2026-09-01T23:59:59.999Z")),
    "zazi-mobile-ea-current-groups-2026-09-01.csv"
  );
  assert.equal(
    eaGroupsDownloadFilename(new Date("2026-09-02T00:00:00.000Z")),
    "zazi-mobile-ea-current-groups-2026-09-02.csv"
  );
});
