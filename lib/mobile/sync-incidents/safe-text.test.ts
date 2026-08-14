import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import corpus from "./actor-safe-text-corpus.v1.json";
import { normalizeActorTextCandidate } from "./schema";

interface CorpusCase {
  id: string;
  kind: "display_name" | "school_name";
  value?: string;
  repeat?: { unit: string; count: number };
  expected_valid: boolean;
  expected_normalized?: string;
}

function expand(testCase: CorpusCase): string {
  if (testCase.repeat) return testCase.repeat.unit.repeat(testCase.repeat.count);
  return testCase.value ?? "";
}

test("the versioned actor text corpus has identical Next.js outcomes", () => {
  const corpusBytes = readFileSync(
    new URL("./actor-safe-text-corpus.v1.json", import.meta.url)
  );
  assert.equal(
    createHash("sha256").update(corpusBytes).digest("hex"),
    "4b6bc370d94ff34f7e6332d1b8360a858d530b911e547c2989ad768ac5726848"
  );
  assert.equal(corpus.schema_version, 1);
  for (const testCase of corpus.cases as CorpusCase[]) {
    const expanded = expand(testCase);
    const actual = normalizeActorTextCandidate(expanded, testCase.kind);
    if (testCase.expected_valid) {
      assert.equal(actual, testCase.expected_normalized ?? expanded, testCase.id);
    } else {
      assert.equal(actual, null, testCase.id);
    }
  }
});
