import assert from "node:assert/strict";
import test from "node:test";

import { getEAPerformanceHistory } from "./api";


test("EA history fetch aborts at its budget and degrades to unavailable", async () => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const originalApiUrl = process.env.DJANGO_API_URL;
  const originalSecret = process.env.INTERNAL_API_SECRET;
  process.env.DJANGO_API_URL = "https://django.invalid";
  process.env.INTERNAL_API_SECRET = "test-secret";
  console.error = () => undefined;
  globalThis.fetch = ((_input: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    })) as typeof fetch;

  try {
    const started = performance.now();
    const result = await getEAPerformanceHistory("treatment", 20);
    const elapsed = performance.now() - started;
    assert.equal(result.isLive, false);
    assert.deepEqual(result.data.eas, []);
    assert.ok(elapsed < 500, `abort took ${elapsed}ms`);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
    if (originalApiUrl === undefined) delete process.env.DJANGO_API_URL;
    else process.env.DJANGO_API_URL = originalApiUrl;
    if (originalSecret === undefined) delete process.env.INTERNAL_API_SECRET;
    else process.env.INTERNAL_API_SECRET = originalSecret;
  }
});
