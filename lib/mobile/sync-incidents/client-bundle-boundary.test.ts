import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("client-side incident helpers do not pull the Zod response schema into the bundle", () => {
  for (const path of ["./pager-state.ts", "./presentation.ts"]) {
    assert.doesNotMatch(source(path), /from ["']\.\/schema["']/);
  }

  const timestamps = source("./timestamps.ts");
  assert.doesNotMatch(timestamps, /\bzod\b|\.\/schema/);
});
